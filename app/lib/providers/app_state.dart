import 'package:flutter/material.dart';

class AppState with ChangeNotifier {
  bool _isOffline = false;
  String _syncStatus = 'synced';

  bool get isOffline => _isOffline;
  String get syncStatus => _syncStatus;

  void toggleOffline() {
    _isOffline = !_isOffline;
    notifyListeners();
  }

  void setSyncStatus(String status) {
    _syncStatus = status;
    notifyListeners();
  }
}
