import 'dart:async';
import 'dart:convert';
import 'dart:io';

Uri normalizeServer(String value) {
  final uri = Uri.parse(value.trim());
  if (uri.scheme != 'https' ||
      uri.host.isEmpty ||
      uri.userInfo.isNotEmpty ||
      uri.hasQuery ||
      uri.hasFragment ||
      (uri.path.isNotEmpty && uri.path != '/')) {
    throw const FormatException(
      'Indicá el dominio HTTPS de la API, sin rutas ni credenciales.',
    );
  }
  return uri.replace(path: '');
}

class ApiResponse {
  final int status;
  final dynamic data;
  const ApiResponse(this.status, this.data);
}

typedef ApiSender = Future<ApiResponse> Function(
  Uri uri,
  String? body,
  Map<String, String> headers,
);

/// El token queda en Dart, en memoria, y nunca se entrega a la WebView.
class ApiSession {
  final Uri server;
  final HttpClient _client = HttpClient()
    ..connectionTimeout = const Duration(seconds: 20);
  final ApiSender? sender;
  String _token = '';
  bool _closed = false;
  Future<void> _queue = Future.value();
  ApiSession(String address, {this.sender}) : server = normalizeServer(address);

  Future<ApiResponse> request(String path, String? body) {
    final result = Completer<ApiResponse>();
    _queue = _queue.then((_) async {
      try {
        result.complete(await _request(path, body));
      } catch (error, stack) {
        result.completeError(error, stack);
      }
    });
    return result.future;
  }

  Future<ApiResponse> _request(String path, String? body) async {
    if (_closed) throw StateError('Sesión cerrada.');
    if (!RegExp(
      r'^(state|alerts|assistant|commands|auth/(login|logout|credential)|backups(/[0-9]+)?|audit)$',
    ).hasMatch(path)) {
      throw const FormatException('Operación no disponible.');
    }
    if (body != null && utf8.encode(body).length > 20 * 1024 * 1024) {
      throw const FormatException('Solicitud demasiado grande.');
    }
    final headers = <String, String>{
      'X-ERP-Client': 'mobile',
      if (_token.isNotEmpty) 'Authorization': 'Bearer $_token',
      if (body != null) 'Content-Type': 'application/json',
    };
    final uri = server.resolve('/api/erp/$path');
    final response =
        await (sender?.call(uri, body, headers) ?? _send(uri, body, headers))
            .timeout(const Duration(seconds: 60));
    if (_closed) throw StateError('Sesión cerrada.');
    if (response.status == 401 || path == 'auth/logout') _token = '';
    if (path == 'auth/login' && response.status == 200) {
      final data = Map<String, dynamic>.from(response.data as Map);
      final token = data.remove('accessToken');
      if (token is! String || !RegExp(r'^[a-f0-9]{64}$').hasMatch(token)) {
        throw const FormatException('Respuesta de inicio de sesión inválida.');
      }
      _token = token;
      data.remove('tokenType');
      data.remove('expiresIn');
      return ApiResponse(response.status, data);
    }
    return response;
  }

  Future<ApiResponse> _send(
    Uri uri,
    String? body,
    Map<String, String> headers,
  ) async {
    final request = await _client.openUrl(body == null ? 'GET' : 'POST', uri);
    request.followRedirects = false;
    headers.forEach((key, value) => request.headers.set(key, value));
    if (body != null) request.add(utf8.encode(body));
    final response = await request.close();
    final bytes = <int>[];
    await for (final chunk in response) {
      if (bytes.length + chunk.length > 20 * 1024 * 1024) {
        throw const FormatException('Respuesta demasiado grande.');
      }
      bytes.addAll(chunk);
    }
    return ApiResponse(response.statusCode, jsonDecode(utf8.decode(bytes)));
  }

  Future<void> logout() async {
    if (_token.isNotEmpty) {
      try {
        await request('auth/logout', '{}');
      } catch (_) {
        /* Caducidad del servidor si no hay red. */
      }
    }
    close();
  }

  void close() {
    _closed = true;
    _token = '';
    _client.close(force: true);
  }
}
