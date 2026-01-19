import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Holds the current index for the mobile bottom navigation.
final bottomNavIndexProvider = StateProvider<int>((ref) => 0);
