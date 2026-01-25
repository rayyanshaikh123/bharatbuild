import 'dart:convert';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../storage/sqlite_service.dart';
import '../services/auth_service.dart';
import '../providers/user_provider.dart';
import '../providers/attendance_provider.dart';

final syncServiceProvider = Provider((ref) => SyncService(ref));

class SyncService {
  final Ref _ref;
  final AuthService _auth = AuthService();

  SyncService(this._ref) {
    _initConnectivityListener();
  }

  void _initConnectivityListener() {
    Connectivity().onConnectivityChanged.listen((List<ConnectivityResult> results) {
      if (results.isNotEmpty && !results.contains(ConnectivityResult.none)) {
        syncPending();
      }
    });
  }

  Future<void> syncPending() async {
    final connectivityResult = await Connectivity().checkConnectivity();
    if (connectivityResult == ConnectivityResult.none) return;

    final user = _ref.read(currentUserProvider);
    if (user == null) return;
    final String role = user['role'] ?? 'LABOUR';

    final pending = await SQLiteService.getPendingActions();
    if (pending.isEmpty) return;

    // Convert to format backend expects
    final actions = pending.map((a) {
      return {
        'id': a['id'],
        'action_type': a['action_type'],
        'entity_type': a['entity_type'],
        'project_id': a['project_id'],
        'payload': jsonDecode(a['payload']),
      };
    }).toList();

    try {
      final result = await _auth.syncBatch(role, actions);
      
      // Process result
      final List<dynamic> applied = result['applied'] ?? [];
      final List<dynamic> rejected = result['rejected'] ?? [];
      
      for (final actionId in applied) {
        await SQLiteService.updateActionStatus(actionId.toString(), 'SYNCED');
      }

      for (final reject in rejected) {
        await SQLiteService.updateActionStatus(
          reject['id'].toString(), 
          'FAILED', 
          error: reject['reason']?.toString()
        );
      }

      // After sync, trigger state refresh
      await _refreshAfterSync();
    } catch (e) {
      print('Batch sync error: $e');
    }
  }

  Future<void> _refreshAfterSync() async {
    // Invalidate providers to force refresh from backend
    _ref.invalidate(liveStatusProvider);
    _ref.invalidate(attendanceHistoryProvider);
    _ref.invalidate(todayAttendanceProvider);
    
    // Also refresh dangerous work service related if needed, though they are usually methods not providers
    // But invalidating user/auth state might be good if we have it
  }

  Future<int> performManualSync() async {
    await syncPending();
    final pending = await SQLiteService.getPendingActions();
    return pending.length; // Remaining pending
  }
}
