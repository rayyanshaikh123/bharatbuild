import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_text_theme.dart';

enum ButtonVariant { primary, secondary, danger, outline }

class AppButton extends StatelessWidget {
  final Widget child;
  final VoidCallback? onPressed;
  final ButtonVariant variant;
  final bool disabled;

  const AppButton({
    super.key,
    required this.child,
    this.onPressed,
    this.variant = ButtonVariant.primary,
    this.disabled = false,
  });

  @override
  Widget build(BuildContext context) {
    final bg = variant == ButtonVariant.primary
        ? AppColors.primary
        : variant == ButtonVariant.secondary
        ? AppColors.foreground
        : variant == ButtonVariant.danger
        ? AppColors.danger
        : Colors.transparent;

    final txtColor = variant == ButtonVariant.outline
        ? AppColors.foreground
        : Colors.white;

    final side = variant == ButtonVariant.outline
        ? BorderSide(color: AppColors.foreground, width: 2)
        : BorderSide.none;

    return Opacity(
      opacity: disabled ? 0.4 : 1,
      child: ElevatedButton(
        onPressed: disabled ? null : onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: bg,
          foregroundColor: txtColor,
          padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 24),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: side,
          ),
          textStyle: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w900,
            letterSpacing: 1.5,
          ),
        ),
        child: child,
      ),
    );
  }
}

class CardWidget extends StatelessWidget {
  final Widget child;
  final VoidCallback? onTap;

  const CardWidget({super.key, required this.child, this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(20),
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppColors.border),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.04),
              blurRadius: 12,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: child,
      ),
    );
  }
}

class InputField extends StatelessWidget {
  final String? label;
  final String? placeholder;
  final String? value;
  final ValueChanged<String>? onChanged;
  final bool multiline;

  const InputField({
    super.key,
    this.label,
    this.placeholder,
    this.value,
    this.onChanged,
    this.multiline = false,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (label != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 8.0),
            child: Text(
              label!.toUpperCase(),
              style: Theme.of(context).textTheme.headingMedium.copyWith(
                fontSize: 10,
                fontWeight: FontWeight.w900,
                letterSpacing: 2,
              ),
            ),
          ),
        TextField(
          controller: value != null ? TextEditingController(text: value) : null,
          onChanged: onChanged,
          maxLines: multiline ? null : 1,
          decoration: InputDecoration(
            hintText: placeholder,
            filled: true,
            fillColor: AppColors.background,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: AppColors.border),
            ),
            contentPadding: const EdgeInsets.all(16),
          ),
        ),
      ],
    );
  }
}

class HeaderWidget extends StatelessWidget implements PreferredSizeWidget {
  final String title;
  final VoidCallback? onBack;
  final Widget? trailing;

  const HeaderWidget({
    super.key,
    required this.title,
    this.onBack,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Container(
        height: 60,
        padding: const EdgeInsets.symmetric(horizontal: 20),
        color: AppColors.foreground,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                if (onBack != null)
                  GestureDetector(
                    onTap: onBack,
                    child: Padding(
                      padding: const EdgeInsets.only(right: 15),
                      child: Text(
                        '←',
                        style: TextStyle(
                          color: AppColors.primary,
                          fontSize: 20,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                  ),
                Text(
                  title.toUpperCase(),
                  style: Theme.of(context).textTheme.headingMedium.copyWith(
                    color: Colors.white,
                    fontSize: 12,
                    letterSpacing: 2,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ],
            ),
            if (trailing != null) trailing! else const SizedBox.shrink(),
          ],
        ),
      ),
    );
  }

  @override
  Size get preferredSize => const Size.fromHeight(60);
}

class StatusBadgeSmall extends StatelessWidget {
  final String status;

  const StatusBadgeSmall({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final cfg = _config(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: cfg['bg'] as Color,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        status,
        style: TextStyle(
          fontSize: 9,
          fontWeight: FontWeight.w900,
          color: cfg['text'] as Color,
        ),
      ),
    );
  }

  Map<String, Color> _config(String s) {
    switch (s.toUpperCase()) {
      case 'PENDING':
        return {'bg': AppColors.pendingBackground, 'text': AppColors.pending};
      case 'SUBMITTED':
        return {'bg': AppColors.infoBackground, 'text': AppColors.info};
      case 'APPROVED':
        return {'bg': AppColors.success, 'text': AppColors.successForeground};
      case 'REJECTED':
        return {'bg': AppColors.dangerBackground, 'text': AppColors.danger};
      default:
        return {'bg': AppColors.card, 'text': AppColors.mutedForeground};
    }
  }
}
