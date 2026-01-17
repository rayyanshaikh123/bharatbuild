import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'providers/auth_provider.dart';
import 'providers/app_state.dart';
import 'screens/login_screen.dart';
import 'screens/signup_screen.dart';
import 'screens/verify_email_screen.dart';
import 'screens/forgot_password_screen.dart';
import 'screens/home_screen.dart';
import 'screens/engineer_flow.dart';
import 'screens/labour_flow.dart';
import 'theme.dart';

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  MyApp({super.key});

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
        home: Consumer<AuthProvider>(
          builder: (context, auth, _) {
            return auth.isAuthenticated ? HomeScreen() : LoginScreen();
          },
        ),
        routes: {
          '/login': (_) => LoginScreen(),
          '/signup': (_) => SignupScreen(),
          '/forgot-password': (_) => ForgotPasswordScreen(),
          '/engineer-flow': (_) => EngineerFlowScreen(),
          '/labour-flow': (_) => LabourFlowScreen(),
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
