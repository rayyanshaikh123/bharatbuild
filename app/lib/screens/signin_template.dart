import 'package:flutter/material.dart';

class SignInTemplate extends StatelessWidget {
  final String title;
  final Widget child;

  const SignInTemplate({super.key, required this.title, required this.child});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            return SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24.0),
              child: Column(
                children: [
                  SizedBox(height: constraints.maxHeight * 0.1),
                  Hero(
                    tag: 'logo',
                    child: Image.asset(
                      'assets/images/bharatbuild_logo.png',
                      height: 100,
                    ),
                  ),
                  SizedBox(height: constraints.maxHeight * 0.08),
                  Text(
                    title,
                    style: theme.textTheme.headlineSmall!.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  SizedBox(height: 32),
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
