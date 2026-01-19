import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStorageService {
  final _storage = const FlutterSecureStorage();

  Future<void> writeToken(String token) =>
      _storage.write(key: 'jwt', value: token);
  Future<String?> readToken() => _storage.read(key: 'jwt');
  Future<void> clear() => _storage.deleteAll();
}
