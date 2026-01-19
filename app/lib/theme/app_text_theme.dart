import 'package:flutter/material.dart';
import 'app_colors.dart';

extension AppTextTheme on TextTheme {
  TextStyle get headingLarge =>
      headlineLarge ??
      titleLarge ??
      TextStyle(
        fontSize: 20,
        fontWeight: FontWeight.w800,
        color: AppColors.foreground,
      );

  TextStyle get headingMedium =>
      headlineMedium ??
      titleMedium ??
      TextStyle(
        fontSize: 16,
        fontWeight: FontWeight.w700,
        color: AppColors.foreground,
      );

  TextStyle get bodyStyle =>
      bodyLarge ??
      bodyMedium ??
      TextStyle(fontSize: 14, color: AppColors.foreground);

  TextStyle get mutedStyle =>
      bodySmall ??
      bodyMedium?.copyWith(color: AppColors.mutedForeground) ??
      TextStyle(fontSize: 13, color: AppColors.mutedForeground);
}
