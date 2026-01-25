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
import 'dart:ui';
import 'dangerous_work_request.dart';
import 'check_in_screen.dart';
import '../../map/geofence_service.dart';

class ShiftStatusScreen extends ConsumerStatefulWidget {
  const ShiftStatusScreen({super.key});

  @override
  ConsumerState<ShiftStatusScreen> createState() => _ShiftStatusScreenState();
}

class _ShiftStatusScreenState extends ConsumerState<ShiftStatusScreen> {
  Timer? _ticker;
  Duration _elapsed = Duration.zero;
  StreamSubscription<List<ConnectivityResult>>? _connectivitySub;
  StreamSubscription<Position>? _positionSub;
  
  bool _isOffline = false;
  Position? _currentLocalPos;
  Map<String, dynamic>? _localValidation;
  final GeofenceService _geofenceService = GeofenceService();
  bool _isCheckingOut = false;

  @override
  void initState() {
    super.initState();
    _startTimer();
    _checkConnectivity();
    _startLocalMonitoring();
    _connectivitySub = Connectivity().onConnectivityChanged.listen((results) {
      setState(() => _isOffline = results.isEmpty || results.contains(ConnectivityResult.none));
    });
  }

  @override
  void dispose() {
    _ticker?.cancel();
    _connectivitySub?.cancel();
    _positionSub?.cancel();
    super.dispose();
  }

  Future<void> _checkConnectivity() async {
    final results = await Connectivity().checkConnectivity();
    setState(() => _isOffline = results.isEmpty || results.contains(ConnectivityResult.none));
  }

  void _startLocalMonitoring() {
    final settings = AndroidSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 5,
    );
    _positionSub = Geolocator.getPositionStream(locationSettings: settings).listen((pos) {
      if (mounted) {
        setState(() {
          _currentLocalPos = pos;
          _updateLocalValidation();
        });
      }
    });
    
    // Initial pos
    Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high).then((pos) {
      if (mounted) setState(() { _currentLocalPos = pos; _updateLocalValidation(); });
    });
  }

  void _updateLocalValidation() {
    final statusAsync = ref.read(liveStatusProvider);
    final status = statusAsync.value;
    if (status != null && _currentLocalPos != null) {
      _localValidation = _geofenceService.validateGeofence(
        _currentLocalPos!.latitude, 
        _currentLocalPos!.longitude, 
        status // status includes project details now
      );
    }
  }

  void _startTimer() {
    _ticker = Timer.periodic(const Duration(seconds: 1), (timer) {
      final statusAsync = ref.read(liveStatusProvider);
      final status = statusAsync.value;
      if (status != null && status['shift_end'] != null) {
        try {
          // Parse HH:mm:ss shift end time
          final now = DateTime.now();
          final parts = status['shift_end'].toString().split(':');
          final shiftEnd = DateTime(
            now.year, now.month, now.day,
            int.parse(parts[0]), int.parse(parts[1]), parts.length > 2 ? int.parse(parts[2]) : 0
          );
          
          final diff = shiftEnd.difference(now);
          
          if (mounted) {
            setState(() {
              _elapsed = diff.isNegative ? Duration.zero : diff;
            });
          }
        } catch (e) {
          print('Timer parse error: $e');
        }
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
    
    if (!isWorking || hourlyRate <= 0 || data['session_start'] == null) return baseWages;

    final start = DateTime.parse(data['session_start']).toLocal();
    final diff = DateTime.now().difference(start);
    final currentSessionSeconds = diff.isNegative ? 0 : diff.inSeconds;
    final prevWorkHours = double.tryParse(data['work_hours_today']?.toString() ?? '0') ?? 0.0;
    
    return (prevWorkHours + (currentSessionSeconds / 3600.0)) * hourlyRate;
  }

  @override
  Widget build(BuildContext context) {
    final statusAsync = ref.watch(liveStatusProvider);
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        leading: const BackButton(color: Colors.white),
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text('shift_duration'.tr().toUpperCase(), style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold, letterSpacing: 1.2)),
        actions: [
          if (_isOffline)
            const Padding(
              padding: EdgeInsets.only(right: 16),
              child: Icon(Icons.wifi_off, color: Colors.orange),
            ),
          IconButton(
            onPressed: () => ref.invalidate(liveStatusProvider),
            icon: const Icon(Icons.refresh, color: Colors.white),
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
             ElevatedButton(onPressed: () => Navigator.pop(context), child: const Text('Back to Check-in')),
           ],
         ),
       );
    }

    // LOCAL-FIRST LOGIC: Use real-time coords for UI feedback, fallback to backend status
    final isInside = _localValidation?['isValid'] ?? data['is_inside'] ?? true;
    final liveDistance = _localValidation?['distance'] ?? 0;
    
    final isWorking = data['status'] == 'WORKING';
    final breachCount = data['breach_count'] ?? 0;
    final currentWage = _calculateRealtimeWage(data);

    return Stack(
      children: [
        // Premium Mesh-like Background
        Positioned.fill(
          child: Container(color: theme.scaffoldBackgroundColor),
        ),
        Positioned(
          top: -100,
          right: -100,
          child: _MeshCircle(
            size: 400,
            color: (isInside ? AppColors.primary : Colors.red).withOpacity(0.2),
          ),
        ),
        Positioned(
          top: 200,
          left: -150,
          child: _MeshCircle(
            size: 500,
            color: (isInside ? AppColors.secondary : Colors.orange).withOpacity(0.1),
          ),
        ),
        Positioned.fill(
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 80, sigmaY: 80),
            child: Container(color: Colors.transparent),
          ),
        ),
        
        SafeArea(
          child: RefreshIndicator(
            onRefresh: () => ref.read(liveStatusProvider.future),
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              physics: const AlwaysScrollableScrollPhysics(),
              child: Column(
                children: [
                  const SizedBox(height: 10),
                  Text(
                    data['project_name'] ?? 'Active Project',
                    style: theme.textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w900,
                      color: theme.colorScheme.onSurface,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 30),
                  
                  // Pulse Timer - FRONT AND CENTER
                  _TimerCircle(
                    isWorking: isWorking,
                    isInside: isInside,
                    elapsed: _elapsed,
                    theme: theme,
                  ),
                  
                  const SizedBox(height: 40),

                  // Realtime Earnings & Status
                  _buildStatusCards(isInside, liveDistance, breachCount, currentWage, theme),
                  
                  const SizedBox(height: 32),

                  // Integrated Features - QUICK CARDS
                  _buildIntegratedFeatures(context, theme, data),

                  const SizedBox(height: 40),

                  // Main Actions
                  _buildMainActions(context, theme, data),
                  
                  const SizedBox(height: 40),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildStatusCards(bool isInside, int distance, int breaches, double wages, ThemeData theme) {
    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: _GlassCard(
                child: _statContainer(
                  isInside ? 'inside_site'.tr() : 'outside_paused'.tr(),
                  isInside ? Icons.verified_user : Icons.warning_rounded,
                  isInside ? Colors.green : Colors.red,
                  distance > 0 ? '${distance}m away' : 'Accuracy Good',
                  theme,
                ),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: _GlassCard(
                child: _statContainer(
                  'todays_earnings'.tr(),
                  Icons.account_balance_wallet,
                  Colors.green,
                  '₹${wages.toStringAsFixed(2)}',
                  theme,
                ),
              ),
            ),
          ],
        ),
        if (!isInside) ...[
          const SizedBox(height: 16),
          _GlassCard(
            color: Colors.red.withOpacity(0.1),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 20),
              child: Row(
                children: [
                  const Icon(Icons.info_outline, color: Colors.red, size: 24),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Text(
                      'You are $distance m away from the boundary. Tracking is currently paused.',
                      style: const TextStyle(color: Colors.red, fontWeight: FontWeight.w600, fontSize: 13),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _statContainer(String title, IconData icon, Color color, String subtitle, ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 24),
          ),
          const SizedBox(height: 16),
          Text(title, style: TextStyle(color: theme.colorScheme.onSurface.withOpacity(0.5), fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.5)),
          const SizedBox(height: 6),
          Text(subtitle, style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w900, color: theme.colorScheme.onSurface)),
        ],
      ),
    );
  }

  Widget _buildIntegratedFeatures(BuildContext context, ThemeData theme, Map<String, dynamic> data) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('quick_features'.tr(), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            TextButton(onPressed: () {}, child: Text('view_all'.tr())),
          ],
        ),
        const SizedBox(height: 8),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 16,
          crossAxisSpacing: 16,
          childAspectRatio: 1.4,
          children: [
            _featureCard(
              'request_tool'.tr(),
              Icons.construction_rounded,
              Colors.blue,
              () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ToolRequestScanner())),
            ),
            _featureCard(
              'dangerous_work'.tr(),
              Icons.health_and_safety_rounded,
              Colors.orange,
              () => Navigator.push(context, MaterialPageRoute(builder: (_) => const DangerousWorkRequestScreen())),
            ),
            _featureCard(
              'live_map'.tr(),
              Icons.map_rounded,
              Colors.green,
              () => Navigator.push(context, MaterialPageRoute(builder: (_) => LiveTrackingMapScreen(project: data))),
            ),
            _featureCard(
              'help_support'.tr(),
              Icons.help_center_rounded,
              Colors.purple,
              () {},
            ),
          ],
        ),
      ],
    );
  }

  Widget _featureCard(String label, IconData icon, Color color, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(24),
      child: Container(
        decoration: BoxDecoration(
          color: color.withOpacity(0.08),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: color.withOpacity(0.2)),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: color, size: 32),
            const SizedBox(height: 12),
            Text(label, style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 13)),
          ],
        ),
      ),
    );
  }

  Widget _buildMainActions(BuildContext context, ThemeData theme, Map<String, dynamic> data) {
    final isWorking = data['status'] == 'WORKING';
    
    return Row(
      children: [
        if (!isWorking) ...[
          Expanded(
            child: Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(24),
                gradient: const LinearGradient(
                  colors: [AppColors.primary, AppColors.secondary],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              child: ElevatedButton.icon(
                icon: const Icon(Icons.play_arrow_rounded, size: 28),
                label: const Text('RESUME WORK', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 15, letterSpacing: 1)),
                onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => CheckInScreen())),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.transparent,
                  foregroundColor: Colors.white,
                  minimumSize: const Size(0, 72),
                  shadowColor: Colors.transparent,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
        ],
        ElevatedButton(
          onPressed: () {},
          style: ElevatedButton.styleFrom(
            backgroundColor: theme.colorScheme.surface,
            foregroundColor: theme.colorScheme.onSurface,
            minimumSize: const Size(72, 72),
            padding: EdgeInsets.zero,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(24),
              side: BorderSide(color: theme.colorScheme.outline.withOpacity(0.1)),
            ),
            elevation: 0,
          ),
          child: const Icon(Icons.restaurant_rounded, size: 24),
        ),
        const SizedBox(width: 12),
        if (isWorking)
          Expanded(
            child: Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(24),
                gradient: const LinearGradient(
                  colors: [Colors.redAccent, Colors.red],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.red.withOpacity(0.3),
                    blurRadius: 12,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: ElevatedButton.icon(
                icon: _isCheckingOut 
                    ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Icon(Icons.logout_rounded, size: 22),
                label: Text(_isCheckingOut ? 'checking_out'.tr() : 'finish_shift'.tr(), style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
                onPressed: _isCheckingOut ? null : () => _handleCheckOut(context),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.transparent,
                  foregroundColor: Colors.white,
                  minimumSize: const Size(0, 72),
                  shadowColor: Colors.transparent,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                ),
              ),
            ),
          ),
        if (!isWorking)
          Container(
            decoration: BoxDecoration(
              color: Colors.red.withOpacity(0.1),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: Colors.red.withOpacity(0.2)),
            ),
            child: IconButton(
              onPressed: () => _handleCheckOut(context),
              icon: const Icon(Icons.power_settings_new_rounded, color: Colors.red),
              padding: const EdgeInsets.all(24),
              tooltip: 'finish_shift'.tr(),
            ),
          ),
      ],
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
          TextButton(onPressed: () => Navigator.pop(context, true), style: TextButton.styleFrom(foregroundColor: Colors.red), child: Text('confirm'.tr())),
        ],
      ),
    );

    if (confirmed == true) {
      setState(() => _isCheckingOut = true);
      try {
        await ref.read(checkOutProvider.future);
        
        // Ensure all providers are invalidated for fresh data
        ref.invalidate(todayAttendanceProvider);
        ref.invalidate(attendanceHistoryProvider);
        ref.invalidate(liveStatusProvider);
        
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('checked_out_successfully'.tr()),
              backgroundColor: Colors.green,
            ),
          );
          // Use pushReplacementNamed to ensure clean navigation
          Navigator.pushReplacementNamed(context, '/labour-dashboard');
        }
      } catch (e) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('checkout_failed'.tr() + ': $e'),
              backgroundColor: Colors.red,
            ),
          );
        }
      } finally {
        if (mounted) {
          setState(() => _isCheckingOut = false);
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
            width: 280,
            height: 280,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: widget.theme.scaffoldBackgroundColor,
              boxShadow: [
                // Deep inner shadow for 3D effect - removed unsupported inset for now
                BoxShadow(
                  color: Colors.black.withOpacity(0.08),
                  blurRadius: 40,
                ),
                // Outer glow shadow
                BoxShadow(
                  color: statusColor.withOpacity(0.12 * _pulseController.value),
                  blurRadius: 30 + (25 * _pulseController.value),
                  spreadRadius: 8 + (12 * _pulseController.value),
                ),
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 20,
                  offset: const Offset(0, 10),
                ),
              ],
              border: Border.all(
                color: statusColor.withOpacity(0.05 + (0.35 * _pulseController.value)),
                width: 14,
              ),
            ),
            child: child,
          );
        },
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
              decoration: BoxDecoration(
                color: statusColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: statusColor.withOpacity(0.15)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 6, height: 6,
                    decoration: BoxDecoration(color: statusColor, shape: BoxShape.circle),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    widget.isWorking ? 'working'.tr().toUpperCase() : 'on_break'.tr().toUpperCase(),
                    style: TextStyle(
                      color: statusColor,
                      fontWeight: FontWeight.w900,
                      fontSize: 10,
                      letterSpacing: 1.2,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Text(
              _formatDuration(widget.elapsed),
              style: widget.theme.textTheme.headlineMedium?.copyWith(
                fontWeight: FontWeight.w900,
                fontSize: 54,
                letterSpacing: -2,
                color: widget.theme.colorScheme.onSurface,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'shift_duration'.tr().toUpperCase(),
              style: TextStyle(color: Colors.grey[500], fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 1),
            ),
          ],
        ),
      ),
    );
  }
}

class _MeshCircle extends StatelessWidget {
  final double size;
  final Color color;

  const _MeshCircle({required this.size, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: RadialGradient(
          colors: [color, color.withOpacity(0)],
        ),
      ),
    );
  }
}

class _GlassCard extends StatelessWidget {
  final Widget child;
  final Color? color;

  const _GlassCard({required this.child, this.color});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ClipRRect(
      borderRadius: BorderRadius.circular(28),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          decoration: BoxDecoration(
            color: color ?? theme.colorScheme.surface.withOpacity(0.7),
            borderRadius: BorderRadius.circular(28),
            border: Border.all(
              color: theme.colorScheme.outline.withOpacity(0.08),
              width: 1.5,
            ),
          ),
          child: child,
        ),
      ),
    );
  }
}
