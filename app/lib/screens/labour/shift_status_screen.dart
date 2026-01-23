import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:geolocator/geolocator.dart';
import '../../providers/attendance_provider.dart';
import '../../providers/auth_providers.dart';
import '../../theme/app_colors.dart';

class ShiftStatusScreen extends ConsumerStatefulWidget {
  const ShiftStatusScreen({super.key});

  @override
  ConsumerState<ShiftStatusScreen> createState() => _ShiftStatusScreenState();
}

class _ShiftStatusScreenState extends ConsumerState<ShiftStatusScreen> {
  Timer? _ticker;
  Duration _elapsed = Duration.zero;
  StreamSubscription<Position>? _positionStream;

  @override
  void initState() {
    super.initState();
    _startTimer();
    _startLocationTracking();
  }

  @override
  void dispose() {
    _ticker?.cancel();
    _positionStream?.cancel();
    super.dispose();
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

  void _startLocationTracking() {
    const locationSettings = LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 50, // Track every 50 meters
    );
    _positionStream = Geolocator.getPositionStream(locationSettings: locationSettings).listen((Position position) {
      // Send to backend
      ref.read(authServiceProvider).trackLocation(position.latitude, position.longitude);
      // Refresh status to see if we breached
      ref.invalidate(liveStatusProvider);
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
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: const BoxDecoration(color: Colors.white24, shape: BoxShape.circle),
                    child: const Icon(Icons.notifications_none, color: Colors.white),
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
            
            const SizedBox(height: 48),
            
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
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline, color: Colors.red, size: 20),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'geofence_breach_warning'.tr(args: [breachCount.toString()]),
                          style: const TextStyle(color: Colors.red, fontSize: 13, fontWeight: FontWeight.w500),
                        ),
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
                  // Lunch Break Button (Placeholder logic)
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () {
                        // In reality, this might trigger a specific lunch session
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
                  // Check Out Button
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
