import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/auth_providers.dart';
import '../theme/app_colors.dart';

class LoginScreen extends ConsumerStatefulWidget {
  final String? initialRole;
  LoginScreen({super.key, this.initialRole});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  final _otpController = TextEditingController();
  String _role = 'engineer';
  bool _didInitArgs = false;
  bool _otpSent = false;

  @override
  void dispose() {
    _emailController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_didInitArgs) {
      // Priority: explicit constructor `initialRole`, then route args.
      if (widget.initialRole != null) {
        _role = widget.initialRole!;
      } else {
        final args =
            ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
        if (args != null && args['role'] != null) {
          _role = args['role'] as String;
        }
      }
      _didInitArgs = true;
    }
  }

  Future<void> _submit() async {
    if (_role == 'labour') {
      // Labour OTP flow handled inline here
      if (!_otpSent) {
        final phone = _phoneController.text.trim();
        if (phone.isEmpty) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(const SnackBar(content: Text('Phone is required')));
          return;
        }
        try {
          await ref.read(labourOtpRequestProvider(phone).future);
          setState(() => _otpSent = true);
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(const SnackBar(content: Text('OTP requested')));
        } catch (e) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(SnackBar(content: Text('OTP request failed: $e')));
        }
        return;
      }

      // Verify OTP
      final phone = _phoneController.text.trim();
      final otp = _otpController.text.trim();
      if (otp.isEmpty) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('OTP is required')));
        return;
      }
      try {
        await ref.read(
          labourOtpVerifyProvider({'phone': phone, 'otp': otp}).future,
        );
        Navigator.pushReplacementNamed(context, '/labour-flow');
      } catch (e) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('OTP verify failed: $e')));
      }
      return;
    }

    if (!_formKey.currentState!.validate()) return;

    final email = _emailController.text.trim();
    final password = _passwordController.text;
    try {
      // Only engineer login is supported for non-labour roles
      await ref.read(
        engineerLoginProvider({'email': email, 'password': password}).future,
      );
      Navigator.pushReplacementNamed(context, '/engineer-flow');
    } catch (e) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Login failed: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    // role initialization moved to didChangeDependencies to avoid mutating
    // state during build

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            return SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              child: Column(
                children: [
                  SizedBox(height: constraints.maxHeight * 0.1),
                  Image.network(
                    "https://i.postimg.cc/nz0YBQcH/Logo-light.png",
                    height: 100,
                  ),
                  SizedBox(height: constraints.maxHeight * 0.1),
                  Text(
                    "Sign In",
                    style: Theme.of(context).textTheme.headlineSmall!.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  SizedBox(height: constraints.maxHeight * 0.05),

                  DropdownButtonFormField<String>(
                    value: _role,
                    items: const [
                      DropdownMenuItem(
                        value: 'engineer',
                        child: Text('Engineer'),
                      ),
                      DropdownMenuItem(value: 'labour', child: Text('Labour')),
                    ],
                    onChanged: (v) => setState(() {
                      final newRole = v ?? 'engineer';
                      if (newRole != _role) {
                        // clear fields that are not relevant for the new role
                        _emailController.clear();
                        _phoneController.clear();
                        _passwordController.clear();
                      }
                      _role = newRole;
                    }),
                    decoration: InputDecoration(
                      filled: true,
                      fillColor: AppColors.accent,
                      contentPadding: EdgeInsets.symmetric(
                        horizontal: 24.0,
                        vertical: 16.0,
                      ),
                      border: OutlineInputBorder(
                        borderSide: BorderSide.none,
                        borderRadius: BorderRadius.all(Radius.circular(50)),
                      ),
                    ),
                    dropdownColor: AppColors.accent,
                  ),
                  const SizedBox(height: 12.0),
                  Form(
                    key: _formKey,
                    child: Column(
                      children: [
                        if (_role == 'labour') ...[
                          TextFormField(
                            controller: _phoneController,
                            decoration: InputDecoration(
                              hintText: 'Phone',
                              filled: true,
                              fillColor: AppColors.accent,
                              contentPadding: EdgeInsets.symmetric(
                                horizontal: 24.0,
                                vertical: 16.0,
                              ),
                              border: OutlineInputBorder(
                                borderSide: BorderSide.none,
                                borderRadius: BorderRadius.all(
                                  Radius.circular(50),
                                ),
                              ),
                            ),
                            keyboardType: TextInputType.phone,
                            validator: (v) =>
                                (v ?? '').isEmpty ? 'Required' : null,
                          ),
                          const SizedBox(height: 12.0),
                          if (_otpSent) ...[
                            TextFormField(
                              controller: _otpController,
                              decoration: InputDecoration(
                                hintText: 'OTP',
                                filled: true,
                                fillColor: AppColors.accent,
                                contentPadding: EdgeInsets.symmetric(
                                  horizontal: 24.0,
                                  vertical: 16.0,
                                ),
                                border: OutlineInputBorder(
                                  borderSide: BorderSide.none,
                                  borderRadius: BorderRadius.all(
                                    Radius.circular(50),
                                  ),
                                ),
                              ),
                              keyboardType: TextInputType.number,
                            ),
                          ],
                        ] else ...[
                          TextFormField(
                            controller: _emailController,
                            decoration: InputDecoration(
                              hintText: 'Email',
                              filled: true,
                              fillColor: AppColors.accent,
                              contentPadding: EdgeInsets.symmetric(
                                horizontal: 24.0,
                                vertical: 16.0,
                              ),
                              border: OutlineInputBorder(
                                borderSide: BorderSide.none,
                                borderRadius: BorderRadius.all(
                                  Radius.circular(50),
                                ),
                              ),
                            ),
                            keyboardType: TextInputType.emailAddress,
                            validator: (v) =>
                                (v ?? '').isEmpty ? 'Required' : null,
                          ),
                          const SizedBox(height: 12.0),
                          TextFormField(
                            controller: _passwordController,
                            decoration: InputDecoration(
                              hintText: 'Password',
                              filled: true,
                              fillColor: AppColors.accent,
                              contentPadding: EdgeInsets.symmetric(
                                horizontal: 24.0,
                                vertical: 16.0,
                              ),
                              border: OutlineInputBorder(
                                borderSide: BorderSide.none,
                                borderRadius: BorderRadius.all(
                                  Radius.circular(50),
                                ),
                              ),
                            ),
                            obscureText: true,
                            validator: (v) =>
                                (v ?? '').isEmpty ? 'Required' : null,
                          ),
                        ],
                        const SizedBox(height: 16.0),
                        ElevatedButton(
                          onPressed: _submit,
                          style: ElevatedButton.styleFrom(
                            elevation: 0,
                            backgroundColor: AppColors.primary,
                            foregroundColor: Colors.white,
                            minimumSize: const Size(double.infinity, 48),
                            shape: const StadiumBorder(),
                          ),
                          child: Text(
                            _role == 'labour' ? 'Continue' : 'Sign in',
                          ),
                        ),
                        const SizedBox(height: 16.0),
                        if (_role != 'labour')
                          TextButton(
                            onPressed: () => Navigator.pushNamed(
                              context,
                              '/forgot-password',
                            ),
                            child: Text(
                              'Forgot Password?',
                              style: Theme.of(context).textTheme.bodyMedium
                                  ?.copyWith(
                                    color: Theme.of(context)
                                        .textTheme
                                        .bodyLarge
                                        ?.color
                                        ?.withOpacity(0.64),
                                  ),
                            ),
                          ),
                        TextButton(
                          onPressed: () => Navigator.pushNamed(
                            context,
                            '/signup',
                            arguments: {'role': _role},
                          ),
                          child: Text.rich(
                            TextSpan(
                              text: "Don’t have an account? ",
                              children: [
                                TextSpan(
                                  text: "Sign Up",
                                  style: TextStyle(color: AppColors.primary),
                                ),
                              ],
                            ),
                            style: Theme.of(context).textTheme.bodyMedium
                                ?.copyWith(
                                  color: Theme.of(context)
                                      .textTheme
                                      .bodyLarge
                                      ?.color
                                      ?.withOpacity(0.64),
                                ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}
