import 'package:flutter/material.dart';
import 'package:provider/provider.dart' as p;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';

import 'providers/auth_provider.dart';
import 'providers/app_state.dart';
import 'providers/user_provider.dart';
import 'providers/app_config_provider.dart';

import 'services/auth_service.dart';

import 'screens/login_screen.dart';
import 'screens/onboarding_screen.dart';
import 'screens/signup_screen.dart';
import 'screens/verify_email_screen.dart';
import 'screens/forgot_password_screen.dart';

import 'screens/labour/labour_dashboard_screen.dart';
import 'screens/labour/labour_flow.dart';
import 'screens/labour_profile.dart';
import 'screens/complete_profile_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/labour/address_management_screen.dart';
import 'screens/common/settings_screen.dart';
import 'screens/engineer/engineer_flow.dart';
import 'screens/engineer/edit_profile.dart';
import 'screens/engineer/account_settings.dart';
import 'screens/common/notifications_screen.dart';
import 'screens/engineer/labour_requests_screen.dart';
import 'screens/engineer/manual_attendance_screen.dart';
import 'screens/engineer/material_management_screen.dart';
import 'screens/engineer/daily_wages_screen.dart';
import 'screens/engineer/organization_list_screen.dart';
import 'screens/engineer/engineer_project_list.dart';
import 'screens/engineer/engineer_requests_screen.dart';
import 'screens/engineer/tasks_screen.dart';

import 'theme/app_theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await EasyLocalization.ensureInitialized();
  
  runApp(
    EasyLocalization(
      supportedLocales: const [
        Locale('en'),
        Locale('hi'),
        Locale('ta'),
        Locale('gu'),
        Locale('mr'),
      ],
      path: 'assets/translations',
      fallbackLocale: const Locale('en'),
      child: const ProviderScope(child: MyApp()),
    ),
  );
}

class MyApp extends ConsumerWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeProvider);

    return p.MultiProvider(
      providers: [
        p.ChangeNotifierProvider(create: (_) => AuthProvider()),
        p.ChangeNotifierProvider(create: (_) => AppState()),
      ],
      child: MaterialApp(
        debugShowCheckedModeBanner: false,
        title: 'BharatBuild',
        localizationsDelegates: context.localizationDelegates,
        supportedLocales: context.supportedLocales,
        locale: context.locale,
        theme: AppTheme.light(),
        darkTheme: AppTheme.dark(),
        themeMode: themeMode,
        home: const SessionGate(),
        routes: {
          '/onboarding': (_) => const OnboardingScreen(),
          '/login': (_) => LoginScreen(),
          '/signup': (_) => SignupScreen(),
          '/forgot-password': (_) => ForgotPasswordScreen(),
          '/labour-dashboard': (_) => const LabourDashboardScreen(),
          '/labour-profile': (_) => const LabourProfileScreen(),
          '/complete-profile': (_) => const CompleteProfileScreen(),
          '/profile': (_) => const ProfileScreen(),
          '/settings': (_) => const SettingsScreen(),
          '/addresses': (_) => const AddressManagementScreen(),
          '/engineer-dashboard': (_) => const EngineerFlowScreen(),
          '/labour-flow': (_) => const LabourFlowScreen(),
          '/engineer-edit-profile': (_) => const EditProfileScreen(),
          '/engineer-settings': (_) => const AccountSettingsScreen(),
          '/engineer-notifications': (_) => const NotificationsScreen(),
          '/notifications': (_) => const NotificationsScreen(),
          '/engineer-labour-requests': (_) => const LabourRequestsScreen(),
          '/engineer-attendance': (_) => const ManualAttendanceScreen(),
          '/engineer-wages': (_) => const DailyWagesScreen(),
          '/engineer-organization': (_) => const OrganizationListScreen(),
          '/engineer-join-project': (_) => const EngineerProjectListScreen(),
          '/engineer-my-requests': (_) => const EngineerRequestsScreen(),
          '/engineer-materials': (_) => const MaterialManagementScreen(),
          '/engineer-tasks': (_) => const TasksScreen(),
        },
        onGenerateRoute: (settings) {
          if (settings.name == '/verify-email') {
            final args = settings.arguments as Map<String, dynamic>;
            return MaterialPageRoute(
              builder: (_) => VerifyEmailScreen(email: args['email']),
            );
          }
          return null;
        },
      ),
    );
  }
}

class SessionGate extends ConsumerStatefulWidget {
  const SessionGate({super.key});

  @override
  ConsumerState<SessionGate> createState() => _SessionGateState();
}

class _SessionGateState extends ConsumerState<SessionGate> {
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _checkSession();
  }

  Future<void> _checkSession() async {
    final auth = AuthService();

    try {
      // Run checks in parallel to save time
      final results = await Future.wait([
        auth.checkLabourSession(),
        auth.checkEngineerSession(),
      ]);

      final labour = results[0];
      final engineer = results[1];

      if (labour != null) {
        ref.read(currentUserProvider.notifier).setUser(labour);
        if (!mounted) return;
        Navigator.pushReplacementNamed(context, '/labour-dashboard');
        return;
      }

      if (engineer != null) {
        ref.read(currentUserProvider.notifier).setUser(engineer);
        if (!mounted) return;
        Navigator.pushReplacementNamed(context, '/engineer-dashboard');
        return;
      }
    } catch (e) {
      // ignore error
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    return const OnboardingScreen();
  }
}
