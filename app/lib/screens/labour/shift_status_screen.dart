import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:geolocator/geolocator.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import '../../providers/attendance_provider.dart';
import '../../providers/auth_providers.dart';
import '../../theme/app_colors.dart';
import '../../offline_sync/sync_service.dart';
import '../../storage/sqlite_service.dart';
import 'live_tracking_map_screen.dart';

class ShiftStatusScreen extends ConsumerStatefulWidget {
  const ShiftStatusScreen({super.key});

  @override
  ConsumerState<ShiftStatusScreen> createState() => _ShiftStatusScreenState();
}

class _ShiftStatusScreenState extends ConsumerState<ShiftStatusScreen> {
  Timer? _ticker;
  Duration _elapsed = Duration.zero;
  StreamSubscription<List<ConnectivityResult>>? _connectivitySub;
  bool _isOffline = false;
  int _localBreachCount = 0;

  @override
  void initState() {
    super.initState();
    _startTimer();
    _checkConnectivity();
    _connectivitySub = Connectivity().onConnectivityChanged.listen((results) {
      setState(() => _isOffline = results.isEmpty || results.contains(ConnectivityResult.none));
    });
  }

  @override
  void dispose() {
    _ticker?.cancel();
    _connectivitySub?.cancel();
    super.dispose();
  }

  Future<void> _checkConnectivity() async {
    final results = await Connectivity().checkConnectivity();
    setState(() => _isOffline = results.isEmpty || results.contains(ConnectivityResult.none));
  }

  void _startTimer() {
    _ticker = Timer.periodic(const Duration(seconds: 1), (timer) {
      final status = ref.read(liveStatusProvider).value;
      if (status != null && status['session_start'] != null) {
        final start = DateTime.parse(status['session_start']);
        setState(() {
          _elapsed = DateTime.now().difference(start);
        });
      }
    });
  }

  String _formatDuration(Duration d) {
    String twoDigits(int n) => n.toString().padLeft(2, '0');
    final hours = twoDigits(d.inHours);
    final minutes = twoDigits(d.inMinutes.remainder(60));
    final seconds = twoDigits(d.inSeconds.remainder(60));
    return "$hours:$minutes:$seconds";
  }

  @override
  Widget build(BuildContext context) {
    final statusAsync = ref.watch(liveStatusProvider);
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          if (_isOffline)
            Container(
              margin: const EdgeInsets.only(right: 16),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.orange.withOpacity(0.2),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.orange),
              ),
              child: const Row(
                children: [
                  Icon(Icons.wifi_off, size: 16, color: Colors.orange),
                  SizedBox(width: 8),
                  Text('OFFLINE', style: TextStyle(color: Colors.orange, fontWeight: FontWeight.bold, fontSize: 12)),
                ],
              ),
            ),
        ],
      ),
      extendBodyBehindAppBar: true,
      body: statusAsync.when(
        data: (data) => _buildContent(context, data, theme),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Error: $err')),
      ),
    );
  }

  Widget _buildContent(BuildContext context, Map<String, dynamic> data, ThemeData theme) {
    final isWorking = data['status'] == 'WORKING';
    final isInside = data['is_inside'] ?? true;
    final breachCount = data['breach_count'] ?? 0;
    final maxExits = 3; // From backend logic

    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            isInside ? AppColors.primary.withOpacity(0.8) : Colors.red.withOpacity(0.8),
            theme.scaffoldBackgroundColor,
          ],
          stops: const [0.0, 0.4],
        ),
      ),
      child: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'current_shift'.tr(),
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w500),
                      ),
                      Text(
                        data['project_name'] ?? 'Active Project',
                        style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  IconButton(
                    onPressed: () => ref.read(syncServiceProvider).performManualSync(),
                    icon: const Icon(Icons.sync, color: Colors.white),
                    tooltip: 'Manual Sync',
                  ),
                ],
              ),
            ),
            
            const Spacer(),
            
            // Timer Circle
            Container(
              width: 240,
              height: 240,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: theme.scaffoldBackgroundColor,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.1),
                    blurRadius: 30,
                    offset: const Offset(0, 10),
                  ),
                ],
                border: Border.all(
                  color: isInside ? AppColors.primary : Colors.red,
                  width: 8,
                ),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    isWorking ? 'working'.tr() : 'on_break'.tr(),
                    style: TextStyle(
                      color: isInside ? AppColors.primary : Colors.red,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1.5,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _formatDuration(_elapsed),
                    style: theme.textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                      fontSize: 40,
                    ),
                  ),
                ],
              ),
            ),
            
            const SizedBox(height: 32),

            // Request Attendance Button
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 40),
              child: ElevatedButton.icon(
                onPressed: _handleRequestAttendance,
                icon: const Icon(Icons.touch_app),
                label: const Text('Request Attendance'),
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size(double.infinity, 50),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(25)),
                  backgroundColor: theme.colorScheme.secondary,
                  foregroundColor: Colors.white,
                ),
              ),
            ),
            
            const SizedBox(height: 12),

            // Track on Map Button
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 40),
              child: ElevatedButton.icon(
                onPressed: () {
                   Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => LiveTrackingMapScreen(project: data),
                    ),
                  );
                },
                icon: const Icon(Icons.map_outlined),
                label: const Text('Track on Map'),
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size(double.infinity, 50),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(25)),
                  backgroundColor: Colors.blue.withOpacity(0.1),
                  foregroundColor: Colors.blue,
                  elevation: 0,
                ),
              ),
            ),
            
            const SizedBox(height: 32),
            
            // Stats Row
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Row(
                children: [
                  Expanded(
                    child: _statCard(
                      'earned_today'.tr(),
                      '₹${data['estimated_wages']}',
                      Icons.payments_rounded,
                      theme,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: _statCard(
                      'geofence_status'.tr(),
                      isInside ? 'inside'.tr() : 'outside'.tr(),
                      isInside ? Icons.verified_user : Icons.warning_rounded,
                      theme,
                      valueColor: isInside ? Colors.green : Colors.red,
                    ),
                  ),
                ],
              ),
            ),
            
            if (breachCount > 0)
              Padding(
                padding: const EdgeInsets.only(top: 16, left: 24, right: 24),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: Colors.red.withOpacity(0.05),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.red.withOpacity(0.2)),
                  ),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.report_problem, color: Colors.red, size: 24),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              'Breach Alert: $breachCount / $maxExits warnings used.',
                              style: const TextStyle(color: Colors.red, fontSize: 14, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'WARNING: Exactly 3 breaches will result in automatic blacklisting and work session termination.',
                        style: TextStyle(color: Colors.red, fontSize: 11),
                      ),
                    ],
                  ),
                ),
              ),

            const Spacer(),
            
            // Actions
            Padding(
              padding: const EdgeInsets.all(24),
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('lunch_mode_coming_soon'.tr())),
                        );
                      },
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size(0, 60),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
                      ),
                      child: Text('lunch_break'.tr()),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    flex: 2,
                    child: ElevatedButton(
                      onPressed: () => _handleCheckOut(context),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.red,
                        foregroundColor: Colors.white,
                        minimumSize: const Size(0, 60),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
                        elevation: 0,
                      ),
                      child: Text(
                        'finish_shift'.tr(),
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _statCard(String label, String value, IconData icon, ThemeData theme, {Color? valueColor}) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: theme.colorScheme.primary.withOpacity(0.7)),
          const SizedBox(height: 12),
          Text(label, style: theme.textTheme.labelSmall?.copyWith(color: Colors.grey[600])),
          const SizedBox(height: 4),
          Text(
            value,
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
              color: valueColor ?? Colors.black87,
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _handleRequestAttendance() async {
    // Manually trigger a TRACK action or re-check
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Requesting attendance update...')),
    );
    // This will be picked up by TrackingService in its next loop, or we can force it
    // For now, refreshing the provider
    ref.invalidate(liveStatusProvider);
  }

  Future<void> _handleCheckOut(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('finish_shift'.tr()),
        content: Text('checkout_confirmation'.tr()),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: Text('cancel'.tr())),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: Text('confirm'.tr()),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        await ref.read(checkOutProvider.future);
        if (context.mounted) {
          Navigator.pushReplacementNamed(context, '/labour-dashboard');
        }
      } catch (e) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
        }
      }
    }
  }
}
