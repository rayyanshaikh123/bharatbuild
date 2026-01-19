import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/auth_providers.dart';
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
        Navigator.pushReplacementNamed(context, '/labour-flow');
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
        Navigator.pushReplacementNamed(context, '/engineer-flow');
        return;
      }

      // manager role removed — no action required here
    } catch (e) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Register failed: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_initialized) {
      final args =
          ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
      if (args != null && args['role'] != null) {
        _role = args['role'] as String;
      }
      _initialized = true;
    }
    return SignInTemplate(
      title: 'Sign Up',
      child: Column(
        children: [
          DropdownButtonFormField<String>(
            value: _role,
            items: const [
              DropdownMenuItem(value: 'engineer', child: Text('Engineer')),
              DropdownMenuItem(value: 'labour', child: Text('Labour')),
            ],
            onChanged: (v) => setState(() => _role = v ?? 'engineer'),
            decoration: const InputDecoration(
              filled: true,
              fillColor: Color(0xFFF5FCF9),
              contentPadding: EdgeInsets.symmetric(
                horizontal: 24.0,
                vertical: 16.0,
              ),
              border: OutlineInputBorder(
                borderSide: BorderSide.none,
                borderRadius: BorderRadius.all(Radius.circular(50)),
              ),
            ),
            dropdownColor: Color(0xFFF5FCF9),
          ),
          const SizedBox(height: 12.0),
          TextField(
            controller: _nameController,
            decoration: const InputDecoration(
              hintText: 'Name',
              filled: true,
              fillColor: Color(0xFFF5FCF9),
              contentPadding: EdgeInsets.symmetric(
                horizontal: 24.0,
                vertical: 16.0,
              ),
              border: OutlineInputBorder(
                borderSide: BorderSide.none,
                borderRadius: BorderRadius.all(Radius.circular(50)),
              ),
            ),
          ),
          const SizedBox(height: 12.0),
          if (_role != 'labour')
            TextField(
              controller: _emailController,
              decoration: const InputDecoration(
                hintText: 'Email',
                filled: true,
                fillColor: Color(0xFFF5FCF9),
                contentPadding: EdgeInsets.symmetric(
                  horizontal: 24.0,
                  vertical: 16.0,
                ),
                border: OutlineInputBorder(
                  borderSide: BorderSide.none,
                  borderRadius: BorderRadius.all(Radius.circular(50)),
                ),
              ),
              keyboardType: TextInputType.emailAddress,
            )
          else
            TextField(
              controller: _phoneController,
              decoration: const InputDecoration(
                hintText: 'Phone',
                filled: true,
                fillColor: Color(0xFFF5FCF9),
                contentPadding: EdgeInsets.symmetric(
                  horizontal: 24.0,
                  vertical: 16.0,
                ),
                border: OutlineInputBorder(
                  borderSide: BorderSide.none,
                  borderRadius: BorderRadius.all(Radius.circular(50)),
                ),
              ),
              keyboardType: TextInputType.phone,
            ),
          const SizedBox(height: 12.0),
          if (_role != 'labour')
            TextField(
              controller: _passwordController,
              decoration: const InputDecoration(
                hintText: 'Password',
                filled: true,
                fillColor: Color(0xFFF5FCF9),
                contentPadding: EdgeInsets.symmetric(
                  horizontal: 24.0,
                  vertical: 16.0,
                ),
                border: OutlineInputBorder(
                  borderSide: BorderSide.none,
                  borderRadius: BorderRadius.all(Radius.circular(50)),
                ),
              ),
              obscureText: true,
            ),
          const SizedBox(height: 20),
          ElevatedButton(
            onPressed: _submit,
            style: ElevatedButton.styleFrom(
              elevation: 0,
              backgroundColor: const Color(0xFF00BF6D),
              foregroundColor: Colors.white,
              minimumSize: const Size(160, 48),
              shape: const StadiumBorder(),
            ),
            child: const Text('Sign Up'),
          ),
          const SizedBox(height: 12.0),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text('Already have an account? '),
              TextButton(
                onPressed: () => Navigator.pushNamed(
                  context,
                  '/login',
                  arguments: {'role': _role},
                ),
                child: const Text('Sign in'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
