import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart' show ProviderScope;

import 'providers/auth_provider.dart';
import 'providers/app_state.dart';
import 'screens/login_screen.dart';
import 'screens/onboarding_screen.dart';
import 'screens/engineer_auth_screen_clean.dart';
import 'screens/labour_auth_screen.dart';
import 'screens/verification_screen.dart';
import 'screens/signup_screen.dart';
import 'screens/verify_email_screen.dart';
import 'screens/forgot_password_screen.dart';
import 'screens/home_screen.dart';
import 'screens/engineer_flow.dart';
import 'screens/labour_flow.dart';
import 'screens/labour/labour_dashboard_screen.dart';
import 'screens/labour_profile.dart';
import 'screens/labour_tasks.dart';
import 'screens/labour_attendance.dart';
import 'screens/profile_screen.dart';
import 'theme.dart';

void main() {
  runApp(const ProviderScope(child: MyApp()));
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => AppState()),
      ],
      child: MaterialApp(
        debugShowCheckedModeBanner: false,
        title: 'Flutter Auth',
        theme: AppTheme.light(),
        home: const OnboardingScreen(),
        routes: {
          '/login': (_) => LoginScreen(),
          '/home': (_) => HomeScreen(),
          '/signup': (_) => SignupScreen(),
          '/engineer-auth': (_) => const EngineerAuthScreenClean(),
          '/labour-auth': (_) => const LabourAuthScreen(),
          '/verification': (_) => const VerificationScreen(),
          '/forgot-password': (_) => ForgotPasswordScreen(),
          '/engineer-flow': (_) => EngineerFlowScreen(),
          '/labour-flow': (_) => LabourFlowScreen(),
          '/labour-dashboard': (_) => const LabourDashboardScreen(),
          '/labour-profile': (_) => const LabourProfileScreen(),
          '/profile': (_) => const ProfileScreen(),
          '/labour-tasks': (_) => const LabourTasksScreen(),
          '/labour-attendance': (_) => const LabourAttendanceScreen(),
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
