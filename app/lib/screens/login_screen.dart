import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import '../providers/auth_providers.dart';
import '../providers/user_provider.dart';

class LoginScreen extends ConsumerStatefulWidget {
  final String? initialRole;
  const LoginScreen({super.key, this.initialRole});

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
  bool _obscurePassword = true;

  bool _isLoading = false;

  @override
  void dispose() {
    _emailController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    _otpController.dispose();
    super.dispose();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_didInitArgs) {
      if (widget.initialRole != null) {
        _role = widget.initialRole!;
      } else {
        final args = ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
        if (args != null && args['role'] != null) {
          _role = args['role'] as String;
        }
      }
      _didInitArgs = true;
    }
  }

  Future<void> _submit() async {
    setState(() => _isLoading = true);
    try {
      if (_role == 'labour') {
        if (!_otpSent) {
          final phone = _phoneController.text.trim();
          if (phone.isEmpty) {
            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('required'.tr())));
            setState(() => _isLoading = false);
            return;
          }
          await ref.read(labourOtpRequestProvider(phone).future);
          setState(() => _otpSent = true);
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('otp_requested'.tr())));
          setState(() => _isLoading = false);
          return;
        }

        final phone = _phoneController.text.trim();
        final otp = _otpController.text.trim();
        if (otp.isEmpty) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('required'.tr())));
          setState(() => _isLoading = false);
          return;
        }
        final res = await ref.read(labourOtpVerifyProvider({'phone': phone, 'otp': otp}).future);
        if (res['user'] != null) {
          ref.read(currentUserProvider.notifier).setUser(res['user'] as Map<String, dynamic>);
        }
        if (!mounted) return;
        Navigator.pushReplacementNamed(context, '/labour-dashboard');
        return;
      }

      if (!_formKey.currentState!.validate()) {
        setState(() => _isLoading = false);
        return;
      }

      final email = _emailController.text.trim();
      final password = _passwordController.text;
      final res = await ref.read(engineerLoginProvider({'email': email, 'password': password}).future);
      if (res['user'] != null) {
        ref.read(currentUserProvider.notifier).setUser(res['user'] as Map<String, dynamic>);
      }
      if (!mounted) return;
      Navigator.pushReplacementNamed(context, '/engineer-dashboard');
    } catch (e) {
      if (!mounted) return;
      String errorMsg = e.toString();
      if (errorMsg.contains('OS Error: Connection timed out') || errorMsg.contains('SocketException')) {
        errorMsg = "Connection timed out. Please ensure your device is on the same network as the server (192.168.0.101) and Windows Firewall is not blocking the connection.";
      }
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(errorMsg),
        duration: const Duration(seconds: 5),
      ));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

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
                      theme.brightness == Brightness.dark 
                          ? 'assets/images/logo_dark.png' 
                          : 'assets/images/bharatbuild_logo.png',
                      height: 100,
                    ),
                  ),
                  SizedBox(height: constraints.maxHeight * 0.08),
                  Text(
                    "sign_in".tr(),
                    style: theme.textTheme.headlineSmall!.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  SizedBox(height: 32),
                  DropdownButtonFormField<String>(
                    value: _role,
                    items: [
                      DropdownMenuItem(value: 'engineer', child: Text('engineer'.tr())),
                      DropdownMenuItem(value: 'labour', child: Text('labour'.tr())),
                    ],
                    onChanged: (v) => setState(() {
                      final newRole = v ?? 'engineer';
                      if (newRole != _role) {
                        _emailController.clear();
                        _phoneController.clear();
                        _passwordController.clear();
                        _otpSent = false;
                      }
                      _role = newRole;
                    }),
                    decoration: const InputDecoration(),
                  ),
                  const SizedBox(height: 16.0),
                  Form(
                    key: _formKey,
                    child: Column(
                      children: [
                        if (_role == 'labour') ...[
                          TextFormField(
                            controller: _phoneController,
                            decoration: InputDecoration(hintText: 'phone'.tr()),
                            keyboardType: TextInputType.phone,
                            validator: (v) => (v ?? '').isEmpty ? 'required'.tr() : null,
                          ),
                          const SizedBox(height: 16.0),
                          if (_otpSent) ...[
                            TextFormField(
                              controller: _otpController,
                              decoration: InputDecoration(hintText: 'otp'.tr()),
                              keyboardType: TextInputType.number,
                            ),
                          ],
                        ] else ...[
                          TextFormField(
                            controller: _emailController,
                            decoration: InputDecoration(hintText: 'email'.tr()),
                            keyboardType: TextInputType.emailAddress,
                            validator: (v) => (v ?? '').isEmpty ? 'required'.tr() : null,
                          ),
                          const SizedBox(height: 16.0),
                          TextFormField(
                            controller: _passwordController,
                            decoration: InputDecoration(
                              hintText: 'password'.tr(),
                              suffixIcon: IconButton(
                                icon: Icon(
                                  _obscurePassword ? Icons.visibility_off : Icons.visibility,
                                  color: theme.colorScheme.onSurface.withOpacity(0.6),
                                ),
                                onPressed: () {
                                  setState(() {
                                    _obscurePassword = !_obscurePassword;
                                  });
                                },
                              ),
                            ),
                            obscureText: _obscurePassword,
                            validator: (v) => (v ?? '').isEmpty ? 'required'.tr() : null,
                          ),
                        ],
                        const SizedBox(height: 24.0),
                        ElevatedButton(
                          onPressed: _isLoading ? null : _submit,
                          style: ElevatedButton.styleFrom(
                            minimumSize: const Size(double.infinity, 56),
                          ),
                          child: _isLoading 
                            ? const SizedBox(
                                height: 20, 
                                width: 20, 
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)
                              )
                            : Text(_role == 'labour' ? 'continue'.tr() : 'sign_in'.tr()),
                        ),
                        const SizedBox(height: 16.0),
                        if (_role != 'labour')
                          TextButton(
                            onPressed: () => Navigator.pushNamed(context, '/forgot-password'),
                            child: Text(
                              'forgot_password_q'.tr(),
                              style: theme.textTheme.bodyMedium?.copyWith(
                                color: theme.colorScheme.onSurface.withOpacity(0.6),
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
                              text: "dont_have_account".tr() + " ",
                              children: [
                                TextSpan(
                                  text: "signup".tr(),
                                  style: TextStyle(color: theme.colorScheme.primary, fontWeight: FontWeight.bold),
                                ),
                              ],
                            ),
                            style: theme.textTheme.bodyMedium?.copyWith(
                              color: theme.colorScheme.onSurface.withOpacity(0.6),
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
