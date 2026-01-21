import 'dart:convert';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'offline_queue_service.dart';
import '../services/auth_service.dart';

final syncServiceProvider = Provider((ref) => SyncService());

class SyncService {
  final AuthService _auth = AuthService();

  Future<void> syncPending() async {
    final conn = await Connectivity().checkConnectivity();
    if (conn == ConnectivityResult.none) return;

    final items = await OfflineQueueService.pending();
    for (final it in items) {
      final id = it['id'] as int;
      final endpoint = it['endpoint'] as String;
      final method = it['method'] as String;
      final payloadStr = it['payload'] as String?;
      
      Map<String, dynamic>? payload;
      if (payloadStr != null) {
        payload = jsonDecode(payloadStr);
      }

      try {
        await _auth.syncQueueItem(
          endpoint: endpoint,
          method: method,
          payload: payload,
        );
        await OfflineQueueService.markSynced(id);
      } catch (e) {
        print('Sync failed for item $id: $e');
        // keep in queue and try later
      }
    }
  }

  Future<int> performManualSync() async {
    final conn = await Connectivity().checkConnectivity();
    if (conn == ConnectivityResult.none) {
      throw Exception('No internet connection');
    }

    final pending = await OfflineQueueService.pending();
    if (pending.isEmpty) return 0;

    int successCount = 0;
    for (final it in pending) {
      try {
        await _auth.syncQueueItem(
          endpoint: it['endpoint'],
          method: it['method'],
          payload: it['payload'] != null ? jsonDecode(it['payload']) : null,
        );
        await OfflineQueueService.markSynced(it['id']);
        successCount++;
      } catch (e) {
        print('Manual sync error: $e');
      }
    }
    return successCount;
  }
}
