import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import '../providers/auth_providers.dart';
import 'signin_template.dart';

class SignupScreen extends ConsumerStatefulWidget {
  const SignupScreen({super.key});

  @override
  ConsumerState<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends ConsumerState<SignupScreen> {
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  String _role = 'engineer';
  bool _initialized = false;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    try {
      if (_role == 'labour') {
        await ref.read(
          labourRegisterProvider({
            'name': _nameController.text.trim(),
            'phone': _phoneController.text.trim(),
          }).future,
        );
        if (!mounted) return;
        Navigator.pushReplacementNamed(context, '/labour-dashboard');
        return;
      }

      if (_role == 'engineer') {
        await ref.read(
          engineerRegisterProvider({
            'name': _nameController.text.trim(),
            'email': _emailController.text.trim(),
            'phone': _phoneController.text.trim(),
            'password': _passwordController.text,
          }).future,
        );
        if (!mounted) return;
        Navigator.pushReplacementNamed(context, '/engineer-dashboard');
        return;
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('error'.tr() + ': $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_initialized) {
      final args = ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
      if (args != null && args['role'] != null) {
        _role = args['role'] as String;
      }
      _initialized = true;
    }

    final theme = Theme.of(context);

    return SignInTemplate(
      title: 'signup'.tr(),
      child: Column(
        children: [
          DropdownButtonFormField<String>(
            value: _role,
            items: [
              DropdownMenuItem(value: 'engineer', child: Text('engineer'.tr())),
              DropdownMenuItem(value: 'labour', child: Text('labour'.tr())),
            ],
            onChanged: (v) => setState(() => _role = v ?? 'engineer'),
            decoration: const InputDecoration(),
          ),
          const SizedBox(height: 16.0),
          TextField(
            controller: _nameController,
            decoration: InputDecoration(hintText: 'name'.tr()),
          ),
          const SizedBox(height: 16.0),
          if (_role == 'labour')
            TextField(
              controller: _phoneController,
              decoration: InputDecoration(hintText: 'phone'.tr()),
              keyboardType: TextInputType.phone,
            )
          else
            Column(
              children: [
                TextField(
                  controller: _emailController,
                  decoration: InputDecoration(hintText: 'email'.tr()),
                  keyboardType: TextInputType.emailAddress,
                ),
                const SizedBox(height: 16.0),
                TextField(
                  controller: _phoneController,
                  decoration: InputDecoration(hintText: 'phone'.tr()),
                  keyboardType: TextInputType.phone,
                ),
              ],
            ),
          const SizedBox(height: 16.0),
          if (_role != 'labour')
            TextField(
              controller: _passwordController,
              decoration: InputDecoration(hintText: 'password'.tr()),
              obscureText: true,
            ),
          const SizedBox(height: 32),
          ElevatedButton(
            onPressed: _submit,
            style: ElevatedButton.styleFrom(
              minimumSize: const Size(double.infinity, 56),
            ),
            child: Text('register'.tr()),
          ),
          const SizedBox(height: 24.0),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text('already_have_account'.tr() + " "),
              TextButton(
                onPressed: () => Navigator.pushNamed(
                  context,
                  '/login',
                  arguments: {'role': _role},
                ),
                child: Text('login'.tr(), style: TextStyle(color: theme.colorScheme.primary, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
          const SizedBox(height: 16.0),
        ],
      ),
    );
  }
}
