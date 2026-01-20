import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import '../providers/auth_providers.dart';
import '../providers/user_provider.dart';

class VerificationScreen extends StatelessWidget {
  const VerificationScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final args = ModalRoute.of(context)?.settings.arguments;
    String phone = '';
    if (args is Map<String, dynamic> && args.containsKey('phone')) {
      phone = args['phone'] ?? '';
    }

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
                    child: Image.asset('assets/images/bharatbuild_logo.png', height: 100),
                  ),
                  SizedBox(height: constraints.maxHeight * 0.08),
                  Text(
                    'verify_otp'.tr(),
                    style: theme.textTheme.headlineSmall!.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 16.0),
                    child: Text(
                      'otp_sent_to'.tr(args: [phone.isNotEmpty ? phone : '...']),
                      textAlign: TextAlign.center,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: theme.colorScheme.onSurface.withOpacity(0.6),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  OtpForm(phone: phone),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

class OtpForm extends ConsumerStatefulWidget {
  final String phone;
  const OtpForm({super.key, this.phone = ''});

  @override
  ConsumerState<OtpForm> createState() => _OtpFormState();
}

class _OtpFormState extends ConsumerState<OtpForm> {
  final _formKey = GlobalKey<FormState>();
  late FocusNode _pin1Node;
  late FocusNode _pin2Node;
  late FocusNode _pin3Node;
  late FocusNode _pin4Node;
  final TextEditingController _c1 = TextEditingController();
  final TextEditingController _c2 = TextEditingController();
  final TextEditingController _c3 = TextEditingController();
  final TextEditingController _c4 = TextEditingController();
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _pin1Node = FocusNode();
    _pin2Node = FocusNode();
    _pin3Node = FocusNode();
    _pin4Node = FocusNode();
  }

  @override
  void dispose() {
    _pin1Node.dispose();
    _pin2Node.dispose();
    _pin3Node.dispose();
    _pin4Node.dispose();
    _c1.dispose();
    _c2.dispose();
    _c3.dispose();
    _c4.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Form(
      key: _formKey,
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: OtpTextFormField(
                  controller: _c1,
                  focusNode: _pin1Node,
                  onChanged: (value) {
                    if (value.length == 1) _pin2Node.requestFocus();
                  },
                  autofocus: true,
                ),
              ),
              const SizedBox(width: 12.0),
              Expanded(
                child: OtpTextFormField(
                  controller: _c2,
                  focusNode: _pin2Node,
                  onChanged: (value) {
                    if (value.length == 1) _pin3Node.requestFocus();
                  },
                ),
              ),
              const SizedBox(width: 12.0),
              Expanded(
                child: OtpTextFormField(
                  controller: _c3,
                  focusNode: _pin3Node,
                  onChanged: (value) {
                    if (value.length == 1) _pin4Node.requestFocus();
                  },
                ),
              ),
              const SizedBox(width: 12.0),
              Expanded(
                child: OtpTextFormField(
                  controller: _c4,
                  focusNode: _pin4Node,
                  onChanged: (value) {
                    if (value.length == 1) _pin4Node.unfocus();
                  },
                ),
              ),
            ],
          ),
          const SizedBox(height: 40.0),
          ElevatedButton(
            onPressed: _loading
                ? null
                : () async {
                    if (!_formKey.currentState!.validate()) return;
                    _formKey.currentState!.save();
                    final otp = '${_c1.text}${_c2.text}${_c3.text}${_c4.text}';
                    if (otp.length != 4) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('enter_4_digit_otp'.tr())),
                      );
                      return;
                    }
                    setState(() => _loading = true);
                    try {
                      final result = await ref.read(
                        labourOtpVerifyProvider({
                          'phone': widget.phone,
                          'otp': otp,
                        }).future,
                      );
                      ref.read(currentUserProvider.notifier).state = result;
                      final needsProfile = result['primary_latitude'] == null;
                      if (!mounted) return;
                      if (needsProfile) {
                        Navigator.pushReplacementNamed(context, '/complete-profile');
                      } else {
                        Navigator.pushReplacementNamed(context, '/labour-dashboard');
                      }
                    } catch (e) {
                      if (!mounted) return;
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('error'.tr() + ': $e')),
                      );
                    } finally {
                      if (mounted) setState(() => _loading = false);
                    }
                  },
            style: ElevatedButton.styleFrom(
              minimumSize: const Size(double.infinity, 56),
            ),
            child: _loading
                ? const SizedBox(
                    height: 24,
                    width: 24,
                    child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                  )
                : Text("continue".tr()),
          ),
        ],
      ),
    );
  }
}

class OtpTextFormField extends StatelessWidget {
  final FocusNode? focusNode;
  final ValueChanged<String>? onChanged;
  final bool autofocus;
  final TextEditingController? controller;

  const OtpTextFormField({
    Key? key,
    this.focusNode,
    this.onChanged,
    this.autofocus = false,
    this.controller,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return TextFormField(
      controller: controller,
      focusNode: focusNode,
      onChanged: onChanged,
      autofocus: autofocus,
      inputFormatters: [
        FilteringTextInputFormatter.digitsOnly,
        LengthLimitingTextInputFormatter(1),
      ],
      textAlign: TextAlign.center,
      keyboardType: TextInputType.number,
      style: theme.textTheme.headlineSmall,
      decoration: InputDecoration(
        filled: true,
        fillColor: theme.colorScheme.surface,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: theme.colorScheme.primary, width: 2),
        ),
      ),
    );
  }
}
