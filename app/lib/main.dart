import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'providers/auth_provider.dart';
import 'screens/login_screen.dart';
import 'screens/signup_screen.dart';
import 'screens/verify_email_screen.dart';
import 'screens/forgot_password_screen.dart';
import 'screens/home_screen.dart';

void main() {
  runApp( MyApp());
}

class MyApp extends StatelessWidget {
   MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AuthProvider(),
      child: MaterialApp(
        debugShowCheckedModeBanner: false,
        title: 'Flutter Auth',
        theme: ThemeData(
          primarySwatch: Colors.blue,
        ),
        home: Consumer<AuthProvider>(
          builder: (context, auth, _) {
            return auth.isAuthenticated
                ?  HomeScreen()
                :  LoginScreen();
          },
        ),
        routes: {
          '/login': (_) =>  LoginScreen(),
          '/signup': (_) =>  SignupScreen(),
          '/forgot-password': (_) =>  ForgotPasswordScreen(),
        },
        onGenerateRoute: (settings) {
          if (settings.name == '/verify-email') {
            final args = settings.arguments as Map<String, dynamic>;
            return MaterialPageRoute(
              builder: (_) => VerifyEmailScreen(
                email: args['email'],
              ),
            );
          }
          return null;
        },
      ),
    );
  }
}
