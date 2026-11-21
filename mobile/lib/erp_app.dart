import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math';

import 'package:material_ui/material_ui.dart';
import 'package:flutter/services.dart';
import 'package:file_picker/file_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';

import 'api_session.dart';

class Pyme360App extends StatelessWidget {
  const Pyme360App({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'Pyme 360',
    debugShowCheckedModeBanner: false,
    theme: ThemeData(
      colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xff168bea)),
      useMaterial3: true,
    ),
    home: const CompanyScreen(),
  );
}

class CompanyScreen extends StatefulWidget {
  const CompanyScreen({super.key});
  @override
  State<CompanyScreen> createState() => _CompanyScreenState();
}

class _CompanyScreenState extends State<CompanyScreen> {
  static const _native = MethodChannel('com.pyme360/files');
  final _address = TextEditingController();
  WebViewController? _web;
  HttpServer? _assets;
  ApiSession? _session;
  String? _error;
  bool _busy = true;
  Uri? _local;

  @override
  void initState() {
    super.initState();
    unawaited(_restore());
  }

  Future<void> _restore() async {
    final prefs = await SharedPreferences.getInstance();
    if (!mounted) return;
    _address.text = prefs.getString('server') ?? '';
    setState(() => _busy = false);
    if (_address.text.isNotEmpty) await _connect();
  }

  void _message(String message) {
    if (mounted) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(message)));
    }
  }

  Future<void> _connect() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final session = ApiSession(_address.text);
      final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
      final secret = List.generate(
        24,
        (_) => Random.secure().nextInt(256).toRadixString(16).padLeft(2, '0'),
      ).join();
      final local = Uri.parse('http://127.0.0.1:${server.port}/$secret/');
      server.listen((request) async {
        if (!request.uri.path.startsWith('/$secret/') ||
            !['GET', 'HEAD'].contains(request.method)) {
          request.response.statusCode = 404;
          await request.response.close();
          return;
        }
        final path = request.uri.path.substring(secret.length + 2);
        if (path
            .split('/')
            .any((part) => part == '..' || part.contains('\\'))) {
          request.response.statusCode = 403;
          await request.response.close();
          return;
        }
        try {
          final name = path.isEmpty ? 'index.html' : path;
          final bytes = await rootBundle.load('assets/web/$name');
          request.response.headers.set(
            'Content-Type',
            name.endsWith('.js')
                ? 'text/javascript'
                : name.endsWith('.css')
                ? 'text/css'
                : name.endsWith('.html')
                ? 'text/html; charset=utf-8'
                : 'application/octet-stream',
          );
          request.response.headers.set('Cache-Control', 'no-store');
          request.response.headers.set(
            'Content-Security-Policy',
            "default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' blob: data:; frame-src 'none'; object-src 'none'; base-uri 'self'",
          );
          if (request.method != 'HEAD') {
            request.response.add(
              bytes.buffer.asUint8List(
                bytes.offsetInBytes,
                bytes.lengthInBytes,
              ),
            );
          }
        } catch (_) {
          request.response.statusCode = 404;
        }
        await request.response.close();
      });
      final web = WebViewController()
        ..setJavaScriptMode(JavaScriptMode.unrestricted)
        ..setBackgroundColor(const Color(0xfff4f8fc))
        ..setNavigationDelegate(
          NavigationDelegate(
            onNavigationRequest: (request) =>
                request.url.startsWith(local.toString())
                ? NavigationDecision.navigate
                : NavigationDecision.prevent,
          ),
        )
        ..addJavaScriptChannel(
          'Pyme360Flutter',
          onMessageReceived: (message) =>
              unawaited(_bridge(message.message, session)),
        );
      if (web.platform is AndroidWebViewController) {
        await (web.platform as AndroidWebViewController).setOnShowFileSelector((
          _,
        ) async {
          final selected = await FilePicker.platform.pickFiles(
            allowMultiple: false,
          );
          return selected?.files
                  .where((file) => file.path != null)
                  .map((file) => File(file.path!).uri.toString())
                  .toList() ??
              [];
        });
      }
      if (!mounted) {
        session.close();
        await server.close(force: true);
        return;
      }
      _session = session;
      _assets = server;
      _local = local;
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('server', session.server.toString());
      _web = web;
      await web.loadRequest(local.resolve('index.html'));
      if (mounted) {
        setState(() {
          _web = web;
          _busy = false;
        });
      }
    } on FormatException catch (error) {
      if (mounted) {
        setState(() {
          _error = error.message;
          _busy = false;
        });
      }
    } catch (_) {
      _session?.close();
      _session = null;
      _web = null;
      await _assets?.close(force: true);
      if (mounted) {
        setState(() {
          _error = 'No se pudo preparar la aplicación. Intentá nuevamente.';
          _busy = false;
        });
      }
    }
  }

  Future<void> _bridge(String message, ApiSession session) async {
    if (!identical(_session, session)) return;
    Map<String, dynamic> input;
    try {
      input = jsonDecode(message) as Map<String, dynamic>;
    } catch (_) {
      return;
    }
    if (input['kind'] == 'request') {
      ApiResponse response;
      try {
        final body = input['body'] as String?;
        response = await session.request(
          input['path'] as String,
          body == null || body.isEmpty ? null : body,
        );
      } catch (_) {
        response = const ApiResponse(503, {
          'error': 'No se pudo conectar. Revisá el servidor y tu conexión. Si estabas guardando, actualizá antes de reintentar.',
        });
      }
      if (!identical(_session, session) || !mounted) return;
      final result = jsonEncode({
        'id': input['id'],
        'status': response.status,
        'data': response.data,
      });
      await _web?.runJavaScript(
        "window.dispatchEvent(new CustomEvent('pyme360-response',{detail:$result}));",
      );
    } else if (input['kind'] == 'export') {
      try {
        await _native.invokeMethod('export', {
          'name': input['name'],
          'mime': input['mime'],
          'base64': input['base64'],
        });
      } catch (_) {
        _message('No se pudo guardar el archivo.');
      }
    } else if (input['kind'] == 'print') {
      try {
        await _native.invokeMethod('print', {
          'html': input['html'],
          'baseUrl': _local.toString(),
        });
      } catch (_) {
        _message('No se pudo preparar la impresión.');
      }
    }
  }

  Future<bool> _confirm(String title, String description) async =>
      await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: Text(title),
          content: Text(description),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancelar'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Continuar'),
            ),
          ],
        ),
      ) ??
      false;

  Future<void> _changeServer() async {
    if (!await _confirm(
      'Cambiar servidor',
      'Se cerrará tu sesión. Guardá los cambios pendientes antes de continuar.',
    )) {
      return;
    }
    final session = _session;
    _session = null;
    if (mounted) {
      setState(() {
        _web = null;
        _busy = true;
      });
    }
    await session?.logout();
    await _assets?.close(force: true);
    _assets = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('server');
    if (mounted) setState(() => _busy = false);
  }

  @override
  void dispose() {
    _session?.close();
    unawaited(_assets?.close(force: true));
    _address.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => PopScope(
    canPop: _web == null,
    onPopInvokedWithResult: (didPop, result) async {
      if (!didPop &&
          await _confirm(
            'Salir de Pyme 360',
            'Los cambios sin guardar se perderán.',
          )) {
        await _session?.logout();
        if (mounted) await SystemNavigator.pop();
      }
    },
    child: Scaffold(
      appBar: AppBar(
        title: const Text('Pyme 360'),
        actions: _web == null
            ? []
            : [
                IconButton(
                  tooltip: 'Actualizar',
                  icon: const Icon(Icons.refresh),
                  onPressed: () async {
                    if (await _confirm(
                      'Actualizar datos',
                      'Se perderán los formularios sin guardar.',
                    )) {
                      await _web?.reload();
                    }
                  },
                ),
                IconButton(
                  tooltip: 'Servidor',
                  icon: const Icon(Icons.dns_outlined),
                  onPressed: _changeServer,
                ),
              ],
      ),
      body: SafeArea(
        child: _busy
            ? const Center(child: CircularProgressIndicator())
            : _web != null
            ? WebViewWidget(controller: _web!)
            : Center(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(24),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 480),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const Icon(Icons.business_rounded, size: 64),
                        const SizedBox(height: 24),
                        const Text(
                          'Tu empresa en tus manos',
                          style: TextStyle(
                            fontSize: 26,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 12),
                        const Text(
                          'Conectá con la API de tu empresa e ingresá con el mismo usuario del ERP.',
                        ),
                        const SizedBox(height: 24),
                        TextField(
                          controller: _address,
                          keyboardType: TextInputType.url,
                          autocorrect: false,
                          decoration: const InputDecoration(
                            labelText: 'Servidor HTTPS',
                            hintText: 'https://tu-api.up.railway.app',
                            border: OutlineInputBorder(),
                          ),
                          onSubmitted: (_) => _connect(),
                        ),
                        if (_error != null)
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            child: Text(
                              _error!,
                              style: TextStyle(
                                color: Theme.of(context).colorScheme.error,
                              ),
                            ),
                          ),
                        const SizedBox(height: 20),
                        FilledButton(
                          onPressed: _connect,
                          child: const Text('Conectar con mi empresa'),
                        ),
                        const SizedBox(height: 20),
                        const Text(
                          'Versión 1.5.0 · Requiere conexión a Internet',
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  ),
                ),
              ),
      ),
    ),
  );
}
