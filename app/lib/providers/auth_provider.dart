import 'package:flutter/material.dart';
import '../api/auth_service.dart';

class AuthProvider with ChangeNotifier {
  final AuthService _authService = AuthService();
  String? _token;
  String? _errorMessage;
  bool _isLoading = false;

  String? get token => _token;
  String? get errorMessage => _errorMessage;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _token != null;

  void _setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }

  void _setErrorMessage(String? message) {
    _errorMessage = message;
    notifyListeners();
  }

  Future<void> login(String email, String password) async {
    _setLoading(true);
    _setErrorMessage(null);
    try {
      final response = await _authService.login(email, password);
      _token = response['token']; // Assuming the token is in the response
    } catch (e) {
      _setErrorMessage(e.toString());
    } finally {
      _setLoading(false);
    }
  }

  Future<void> signup(String name, String email, String password) async {
    _setLoading(true);
    _setErrorMessage(null);
    try {
      await _authService.signup(name, email, password);
      // Optionally login the user or navigate to a verification page
    } catch (e) {
      _setErrorMessage(e.toString());
    } finally {
      _setLoading(false);
    }
  }

  Future<void> verifyEmail(String email, String code) async {
    _setLoading(true);
    _setErrorMessage(null);
    try {
      final response = await _authService.verifyEmail(email, code);
      _token = response['token'];
    } catch (e) {
      _setErrorMessage(e.toString());
    } finally {
      _setLoading(false);
    }
  }

  Future<void> forgotPassword(String email) async {
    _setLoading(true);
    _setErrorMessage(null);
    try {
      await _authService.forgotPassword(email);
    } catch (e) {
      _setErrorMessage(e.toString());
    } finally {
      _setLoading(false);
    }
  }

  void logout() {
    _token = null;
    notifyListeners();
  }
}
