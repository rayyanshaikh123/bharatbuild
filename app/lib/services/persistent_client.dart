import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

/// A simple HTTP client that persists cookies in SharedPreferences.
/// It stores the raw "Cookie" header value under key 'session_cookies'.
class PersistentClient extends http.BaseClient {
  final http.Client _inner;
  static const _prefsKey = 'session_cookies';
  Future<SharedPreferences>? _prefsFuture;

  PersistentClient([http.Client? inner]) : _inner = inner ?? http.Client();
  
  Future<SharedPreferences> _getPrefs() {
    _prefsFuture ??= SharedPreferences.getInstance();
    return _prefsFuture!;
  }

  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) async {
    // attach stored cookies
    final prefs = await _getPrefs();
    final cookie = prefs.getString(_prefsKey);
    if (cookie != null && cookie.isNotEmpty) {
      request.headers['cookie'] = cookie;
    }

    final streamed = await _inner.send(request);

    // collect set-cookie headers and persist
    final setCookie = streamed.headers['set-cookie'];
    if (setCookie != null && setCookie.isNotEmpty) {
      await prefs.setString(
        _prefsKey,
        _mergeCookie(prefs.getString(_prefsKey), setCookie),
      );
    }

    return streamed;
  }

  String _mergeCookie(String? existing, String setCookieHeader) {
    final map = <String, String>{};

    void parse(String s) {
      // Set-Cookie headers can be tricky. Multiple cookies might be separated by commas, 
      // but dates also use commas. 
      // Simple split for session management where we usually get one sid per response.
      final parts = s.split(';');
      if (parts.isEmpty) return;
      
      final nv = parts[0].trim();
      if (nv.isEmpty) return;
      
      final idx = nv.indexOf('=');
      if (idx <= 0) return;
      
      final name = nv.substring(0, idx);
      final value = nv.substring(idx + 1);
      map[name] = value;
    }

    if (existing != null && existing.isNotEmpty) {
      for (final c in existing.split(';')) {
        final pair = c.split('=');
        if (pair.length == 2) map[pair[0].trim()] = pair[1].trim();
      }
    }
    
    // For Set-Cookie, the browser/client usually receives one or more 
    // We treat the whole string as potentially multiple cookies separated by commas
    // but we only care about the key-value pairs before the first semicolon of each
    parse(setCookieHeader);

    return map.entries.map((e) => '${e.key}=${e.value}').join('; ');
  }

  static Future<void> clearCookies() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_prefsKey);
  }
}
