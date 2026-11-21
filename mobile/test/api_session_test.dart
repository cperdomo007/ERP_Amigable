import 'package:flutter_test/flutter_test.dart';
import 'package:pyme360/api_session.dart';

void main() {
  test('solo acepta dominios HTTPS sin rutas, credenciales ni consultas', () {
    expect(
      normalizeServer('https://erp.example.com/').toString(),
      'https://erp.example.com',
    );
    for (final value in [
      'http://erp.example.com',
      'https://u:p@erp.example.com',
      'https://erp.example.com/api/erp',
      'https://erp.example.com?x=1',
    ]) {
      expect(() => normalizeServer(value), throwsFormatException);
    }
  });
  test('token en Dart, encabezados móviles, pérdida de sesión y rutas restringidas', () async {
    var count = 0;
    final token = List.filled(64, 'a').join();
    final session = ApiSession(
      'https://api.example.com',
      sender: (uri, body, headers) async {
        expect(headers['X-ERP-Client'], 'mobile');
        count++;
        if (uri.path.endsWith('/login')) {
          return ApiResponse(200, {
            'accessToken': token,
            'tokenType': 'Bearer',
            'expiresIn': 28800,
            'db': {},
          });
        }
        if (count == 2) {
          expect(headers['Authorization'], 'Bearer $token');
          return const ApiResponse(401, {'error': 'Sesión vencida'});
        }
        expect(headers.containsKey('Authorization'), false);
        return const ApiResponse(200, []);
      },
    );
    final login = await session.request('auth/login', '{}');
    expect((login.data as Map).containsKey('accessToken'), false);
    expect((login.data as Map).containsKey('tokenType'), false);
    await session.request('state', null);
    await session.request('audit', null);
    await expectLater(
      session.request('../secret', null),
      throwsFormatException,
    );
    session.close();
    await expectLater(session.request('state', null), throwsStateError);
  });
}
