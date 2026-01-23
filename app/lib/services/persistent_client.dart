import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

/// A simple HTTP client that persists cookies in SharedPreferences.
/// It stores the raw "Cookie" header value under key 'session_cookies'.
class PersistentClient extends http.BaseClient {
  final http.Client _inner;
  static const _prefsKey = 'session_cookies';
  static SharedPreferences? _prefs;

  PersistentClient([http.Client? inner]) : _inner = inner ?? http.Client();

  Future<SharedPreferences> _getPrefs() async {
    _prefs ??= await SharedPreferences.getInstance();
    return _prefs!;
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
    void parseCookieString(String s) {
      for (final part in s.split(',')) {
        final segments = part.split(';');
        if (segments.isEmpty) continue;
        final nv = segments[0].trim();
        if (nv.isEmpty) continue;
        final idx = nv.indexOf('=');
        if (idx <= 0) continue;
        final name = nv.substring(0, idx);
        final value = nv.substring(idx + 1);
        map[name] = value;
      }
    }

    if (existing != null && existing.isNotEmpty) {
      parseCookieString(existing);
    }
    parseCookieString(setCookieHeader);

    return map.entries.map((e) => '${e.key}=${e.value}').join('; ');
  }

  static Future<void> clearCookies() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_prefsKey);
  }
}
