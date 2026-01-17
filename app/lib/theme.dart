import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  static const Color brandOrange = Color(0xFFF97316);
  static const Color brandNavy = Color(0xFF07102A);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color muted = Color(0xFF64748B);
  static const Color cardBorder = Color(0x0F0E1623);
  static const Color background = Color(0xFFF8FAFC);

  static ThemeData light() {
    final base = ThemeData.light();
    return base.copyWith(
      primaryColor: brandOrange,
      scaffoldBackgroundColor: background,
      colorScheme: base.colorScheme.copyWith(
        primary: brandOrange,
        background: background,
        surface: surface,
        onBackground: brandNavy,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: surface,
        foregroundColor: brandNavy,
        elevation: 0,
        titleTextStyle: GoogleFonts.plusJakartaSans(
          fontSize: 18,
          fontWeight: FontWeight.w700,
          color: brandNavy,
        ),
      ),
      // Card appearance handled by widgets to avoid CardTheme type issues
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: brandOrange,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
          textStyle: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w800),
        ),
      ),
      textTheme: GoogleFonts.plusJakartaSansTextTheme(
        base.textTheme,
      ).apply(bodyColor: brandNavy, displayColor: brandNavy),
      iconTheme: const IconThemeData(color: brandNavy),
    );
  }
}
