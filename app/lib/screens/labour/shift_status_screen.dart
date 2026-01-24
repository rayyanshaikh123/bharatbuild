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
import 'tool_request_scanner.dart';
import 'dangerous_work_request.dart';

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
      final statusAsync = ref.read(liveStatusProvider);
      final status = statusAsync.value;
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

  double _calculateRealtimeWage(Map<String, dynamic> data) {
    final baseWages = double.tryParse(data['estimated_wages']?.toString() ?? '0') ?? 0.0;
    final hourlyRate = double.tryParse(data['hourly_rate']?.toString() ?? '0') ?? 0.0;
    final isWorking = data['status'] == 'WORKING';
    
    if (!isWorking || hourlyRate <= 0) return baseWages;

    // The backend provides estimated_wages as (prev_hours + current_session_minutes/60) * rate
    // To make it smoother, we use the elapsed duration since session start for more precision
    if (data['session_start'] == null) return baseWages;

    final start = DateTime.parse(data['session_start']);
    final currentSessionSeconds = DateTime.now().difference(start).inSeconds;
    
    // We want to avoid double-counting. 
    // Backend work_hours includes COMPLETED sessions.
    final prevWorkHours = double.tryParse(data['work_hours_today']?.toString() ?? '0') ?? 0.0;
    
    // Total = (Previous Hours + Current Seconds/3600) * Rate
    return (prevWorkHours + (currentSessionSeconds / 3600.0)) * hourlyRate;
  }

  @override
  Widget build(BuildContext context) {
    final statusAsync = ref.watch(liveStatusProvider);
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: BackButton(
          color: Colors.white,
          onPressed: () => Navigator.of(context).pop(),
        ),
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
    if (data['status'] == 'INACTIVE') {
       return Center(
         child: Column(
           mainAxisAlignment: MainAxisAlignment.center,
           children: [
             const Icon(Icons.timer_off_outlined, size: 64, color: Colors.grey),
             const SizedBox(height: 16),
             Text('no_active_shift'.tr(), style: const TextStyle(fontWeight: FontWeight.bold)),
             const SizedBox(height: 24),
             ElevatedButton(
               onPressed: () => Navigator.pop(context),
               child: const Text('Back to Check-in'),
             ),
           ],
         ),
       );
    }

    final isWorking = data['status'] == 'WORKING';
    final isInside = data['is_inside'] ?? true;
    final breachCount = data['breach_count'] ?? 0;
    final maxExits = 3; 

    final currentWage = _calculateRealtimeWage(data);

    return Container(
      decoration: BoxDecoration(
        color: theme.scaffoldBackgroundColor,
      ),
      child: Stack(
        children: [
          // Background Gradient Header
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            height: 350,
            child: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    isInside ? AppColors.primary : Colors.red,
                    isInside ? AppColors.primary.withOpacity(0.8) : Colors.red.withOpacity(0.8),
                    theme.scaffoldBackgroundColor,
                  ],
                ),
              ),
            ),
          ),
          
          SafeArea(
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              child: Column(
                children: [
                  _buildHeader(data),
                  const SizedBox(height: 20),
                  
                  // Pulse Timer Circle
                  _TimerCircle(
                    isWorking: isWorking,
                    isInside: isInside,
                    elapsed: _elapsed,
                    theme: theme,
                  ),
                  
                  const SizedBox(height: 32),

                  // Realtime Earnings Card
                  _buildEarningsCard(currentWage, data['hourly_rate'], theme),
                  
                  const SizedBox(height: 24),

                  // Quick Actions Grid
                  _buildQuickActions(context, theme),

                  const SizedBox(height: 24),
                  
                  // Geofence Status & Breaches
                  _buildStatusSection(isInside, breachCount, maxExits, theme),

                  const SizedBox(height: 32),

                  // Footer Actions
                  _buildFooterActions(context, theme),
                  
                  const SizedBox(height: 40),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(Map<String, dynamic> data) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'current_shift'.tr().toUpperCase(),
                  style: TextStyle(color: Colors.white.withOpacity(0.8), fontWeight: FontWeight.bold, fontSize: 12, letterSpacing: 1.2),
                ),
                const SizedBox(height: 4),
                Text(
                  data['project_name'] ?? 'Active Project',
                  style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              shape: BoxShape.circle,
            ),
            child: IconButton(
              onPressed: () => ref.read(liveStatusProvider.future),
              icon: const Icon(Icons.refresh, color: Colors.white),
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEarningsCard(double currentWage, dynamic hourlyRate, ThemeData theme) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 24),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(28),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 20, offset: const Offset(0, 10)),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.green.withOpacity(0.1),
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Icon(Icons.account_balance_wallet_rounded, color: Colors.green, size: 32),
          ),
          const SizedBox(width: 20),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'earned_today'.tr(),
                  style: theme.textTheme.labelMedium?.copyWith(color: Colors.grey[600], fontWeight: FontWeight.w500),
                ),
                const SizedBox(height: 4),
                Text(
                  '₹${currentWage.toStringAsFixed(2)}',
                  style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold, color: theme.colorScheme.onSurface),
                ),
              ],
            ),
          ),
          if (hourlyRate != null)
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                 Text(
                   '₹$hourlyRate/hr',
                   style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.grey, fontSize: 13),
                 ),
                 Text(
                   'rate'.tr().toLowerCase(),
                   style: TextStyle(color: Colors.grey[400], fontSize: 10),
                 ),
              ],
            ),
        ],
      ),
    );
  }

  Widget _buildQuickActions(BuildContext context, ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'quick_actions'.tr(),
            style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold, color: Colors.grey[700]),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              _actionButton(
                'Request Tool',
                Icons.construction,
                Colors.blue,
                () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ToolRequestScanner())),
              ),
              const SizedBox(width: 16),
              _actionButton(
                'Dangerous Work',
                Icons.warning_amber_rounded,
                Colors.orange,
                () => Navigator.push(context, MaterialPageRoute(builder: (_) => const DangerousWorkRequestScreen())),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _actionButton(String label, IconData icon, Color color, VoidCallback onTap) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 20),
          decoration: BoxDecoration(
            color: color.withOpacity(0.08),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: color.withOpacity(0.1)),
          ),
          child: Column(
            children: [
              Icon(icon, color: color, size: 28),
              const SizedBox(height: 12),
              Text(label, style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 13)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusSection(bool isInside, int breachCount, int maxExits, ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: isInside ? Colors.green.withOpacity(0.05) : Colors.red.withOpacity(0.05),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: isInside ? Colors.green.withOpacity(0.1) : Colors.red.withOpacity(0.1)),
            ),
            child: Row(
              children: [
                Icon(
                  isInside ? Icons.verified_user : Icons.warning_rounded,
                  color: isInside ? Colors.green : Colors.red,
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        isInside ? 'inside_site'.tr() : 'outside_site'.tr(),
                        style: TextStyle(
                          color: isInside ? Colors.green[700] : Colors.red[700],
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        isInside ? 'attendance_is_active'.tr() : 'attendance_is_paused'.tr(),
                        style: TextStyle(color: Colors.grey[600], fontSize: 12),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          if (breachCount > 0) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: Colors.red.withOpacity(0.08),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(
                children: [
                  const Icon(Icons.report_problem, color: Colors.red, size: 20),
                  const SizedBox(width: 12),
                  Text(
                    'Breach Alert: $breachCount / $maxExits warnings used.',
                    style: const TextStyle(color: Colors.red, fontSize: 13, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildFooterActions(BuildContext context, ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Row(
        children: [
          Expanded(
            child: OutlinedButton(
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('lunch_mode_coming_soon'.tr())));
              },
              style: OutlinedButton.styleFrom(
                minimumSize: const Size(0, 60),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              ),
              child: Text('lunch_break'.tr(), style: const TextStyle(fontWeight: FontWeight.bold)),
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
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                elevation: 0,
              ),
              child: Text('finish_shift'.tr(), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _handleRequestAttendance() async {
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Requesting attendance update...')));
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

class _TimerCircle extends StatefulWidget {
  final bool isWorking;
  final bool isInside;
  final Duration elapsed;
  final ThemeData theme;

  const _TimerCircle({
    required this.isWorking,
    required this.isInside,
    required this.elapsed,
    required this.theme,
  });

  @override
  State<_TimerCircle> createState() => _TimerCircleState();
}

class _TimerCircleState extends State<_TimerCircle> with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
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
    final statusColor = widget.isInside ? AppColors.primary : Colors.red;
    
    return RepaintBoundary(
      child: AnimatedBuilder(
        animation: _pulseController,
        builder: (context, child) {
          return Container(
            width: 260,
            height: 260,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: widget.theme.scaffoldBackgroundColor,
              boxShadow: [
                BoxShadow(
                  color: statusColor.withOpacity(0.15 * _pulseController.value),
                  blurRadius: 30 + (20 * _pulseController.value),
                  spreadRadius: 5 + (10 * _pulseController.value),
                ),
              ],
              border: Border.all(
                color: statusColor.withOpacity(0.1 + (0.4 * _pulseController.value)),
                width: 12,
              ),
            ),
            child: child,
          );
        },
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              decoration: BoxDecoration(
                color: statusColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                widget.isWorking ? 'working'.tr().toUpperCase() : 'on_break'.tr().toUpperCase(),
                style: TextStyle(
                  color: statusColor,
                  fontWeight: FontWeight.bold,
                  fontSize: 10,
                  letterSpacing: 1.5,
                ),
              ),
            ),
            const SizedBox(height: 12),
            Text(
              _formatDuration(widget.elapsed),
              style: widget.theme.textTheme.headlineMedium?.copyWith(
                fontWeight: FontWeight.bold,
                fontSize: 48,
                letterSpacing: -1,
                color: widget.theme.colorScheme.onSurface,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'shift_duration'.tr(),
              style: TextStyle(color: Colors.grey[500], fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }
}
