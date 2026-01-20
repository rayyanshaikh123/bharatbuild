import 'package:flutter/material.dart';
import 'package:provider/provider.dart' as p;
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'providers/auth_provider.dart';
import 'providers/app_state.dart';
import 'providers/user_provider.dart';

import 'services/auth_service.dart';

import 'screens/login_screen.dart';
import 'screens/onboarding_screen.dart';
import 'screens/signup_screen.dart';
import 'screens/verify_email_screen.dart';
import 'screens/forgot_password_screen.dart';

import 'screens/labour/labour_dashboard_screen.dart';
// overview removed; main dashboard uses `LabourDashboardScreen` with AppLayout
import 'screens/labour_profile.dart';
import 'screens/complate_profile_screen.dart';
import 'screens/profile_screen.dart';

import 'theme/app_theme.dart';

void main() {
  runApp(const ProviderScope(child: MyApp()));
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return p.MultiProvider(
      providers: [
        p.ChangeNotifierProvider(create: (_) => AuthProvider()),
        p.ChangeNotifierProvider(create: (_) => AppState()),
      ],
      child: MaterialApp(
        debugShowCheckedModeBanner: false,
        title: 'Flutter Auth',
        theme: AppTheme.light(),
        home: const SessionGate(),
        routes: {
          '/login': (_) => LoginScreen(),
          '/signup': (_) => SignupScreen(),
          '/forgot-password': (_) => ForgotPasswordScreen(),

          '/labour-dashboard': (_) => const LabourDashboardScreen(),
          '/labour-profile': (_) => const LabourProfileScreen(),
          '/complete-profile': (_) => const ComplateProfileScreen(),
          '/profile': (_) => const ProfileScreen(),
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

////////////////////////////////////////////////////////////
/// SESSION GATE MUST BE OUTSIDE MyApp
////////////////////////////////////////////////////////////

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
      final user = await auth.checkLabourSession();

      if (user != null) {
        ref.read(currentUserProvider.notifier).state = user;

        if (!mounted) return;
        Navigator.pushReplacementNamed(context, '/labour-dashboard');
        return;
      }
    } catch (e) {
      // ignore error and go to onboarding
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
