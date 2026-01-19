// Re-export canonical verification screen to avoid duplicate class warnings
export '../../verification_screen.dart';

class OtpTextFormField extends StatelessWidget {
  final FocusNode? focusNode;
  final ValueChanged<String>? onChanged;
  final FormFieldSetter<String>? onSaved;
  final bool autofocus;
  final TextEditingController? controller;

  const OtpTextFormField({
    Key? key,
    this.focusNode,
    this.onChanged,
    this.onSaved,
    this.autofocus = false,
    this.controller,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      autovalidateMode: AutovalidateMode.onUserInteraction,
      controller: controller,
      focusNode: focusNode,
      onChanged: onChanged,
      onSaved: onSaved,
      autofocus: autofocus,
      obscureText: true,
      inputFormatters: [
        FilteringTextInputFormatter.digitsOnly,
        LengthLimitingTextInputFormatter(1),
      ],
      textAlign: TextAlign.center,
      keyboardType: TextInputType.number,
      style: Theme.of(context).textTheme.headlineSmall,
      decoration: otpInputDecoration,
    );
  }
}

class LogoWithTitle extends StatelessWidget {
  final String title, subText;
  final List<Widget> children;

  const LogoWithTitle({
    Key? key,
    required this.title,
    this.subText = '',
    required this.children,
  }) : super(key: key);
  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: LayoutBuilder(
        builder: (context, constraints) {
          return SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 16.0),
            child: Column(
              children: [
                SizedBox(height: constraints.maxHeight * 0.1),
                Image.asset('assets/images/bharatbuild_logo.png', height: 100),
                SizedBox(
                  height: constraints.maxHeight * 0.1,
                  width: double.infinity,
                ),
                Text(
                  title,
                  style: Theme.of(context).textTheme.headlineSmall!.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 16.0),
                  child: Text(
                    subText,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      height: 1.5,
                      color: Theme.of(
                        context,
                      ).textTheme.bodyLarge!.color!.withOpacity(0.64),
                    ),
                  ),
                ),
                ...children,
              ],
            ),
          );
        },
      ),
    );
  }
}
