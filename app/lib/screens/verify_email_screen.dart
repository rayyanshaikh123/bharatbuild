import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';

class VerifyEmailScreen extends StatefulWidget {
  final String email;

  VerifyEmailScreen({required this.email});

  @override
  _VerifyEmailScreenState createState() => _VerifyEmailScreenState();
}

class _VerifyEmailScreenState extends State<VerifyEmailScreen> {
  final _codeController = TextEditingController();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Verify Email')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            Text('Enter the code sent to ${widget.email}'),
            TextField(
              controller: _codeController,
              decoration: InputDecoration(labelText: 'Verification Code'),
            ),
            SizedBox(height: 20),
            ElevatedButton(
              onPressed: () {
                Provider.of<AuthProvider>(
                  context,
                  listen: false,
                ).verifyEmail(widget.email, _codeController.text);
              },
              child: Text('Verify'),
            ),
          ],
        ),
      ),
    );
  }
}
