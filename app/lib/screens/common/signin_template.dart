import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';

class SignInTemplate extends StatelessWidget {
  final String title;
  final Widget child;

  const SignInTemplate({super.key, required this.title, required this.child});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            return SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              child: Column(
                children: [
                  SizedBox(height: constraints.maxHeight * 0.1),
                  Image.asset(
                    'assets/images/bharatbuild_logo.png',
                    height: 100,
                  ),
                  SizedBox(height: constraints.maxHeight * 0.1),
                  Text(
                    title,
                    style: Theme.of(context).textTheme.headlineSmall!.copyWith(
                      fontWeight: FontWeight.bold,
                      color: AppColors.foreground,
                    ),
                  ),
                  SizedBox(height: constraints.maxHeight * 0.05),
                  child,
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}
