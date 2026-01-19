import 'dart:convert';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'offline_queue_service.dart';

class SyncService {
  // stubbed: background worker should call this periodically
  Future<void> syncPending() async {
    final conn = await Connectivity().checkConnectivity();
    if (conn == ConnectivityResult.none) return;

    final items = await OfflineQueueService.pending();
    for (final it in items) {
      final id = it['id'] as int;
      final payload = it['payload'] as String? ?? '{}';
      // TODO: call backend API to upload
      // simulate success and mark synced for now
      await OfflineQueueService.markSynced(id);
    }
  }
}
