import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;
import '../providers/auth_providers.dart';

// Provider to fetch my issued tools
final myIssuedToolsProvider = FutureProvider.autoDispose<List<dynamic>>((ref) async {
  final authRes = ref.watch(authServiceProvider);
  return await authRes.getMyIssuedTools();
});

// Provider to scan QR code
final scanToolQRProvider = FutureProvider.family<Map<String, dynamic>, String>((ref, qrToken) async {
  final authRes = ref.read(authServiceProvider);
  return await authRes.scanToolQR(qrToken);
});

// Provider to fetch my tool history
final myToolHistoryProvider = FutureProvider.family<List<dynamic>, Map<String, String?>>((ref, filters) async {
  final authRes = ref.read(authServiceProvider);
  return await authRes.getMyToolHistory(
    projectId: filters['projectId'],
    status: filters['status'],
  );
});
