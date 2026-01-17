import 'package:flutter/material.dart';

/// A small banner that mirrors the React Native `OfflineBanner` behavior.
class OfflineBanner extends StatelessWidget {
  final bool isOffline;
  final String syncStatus; // e.g. 'synced', 'syncing'
  final VoidCallback? toggleOffline;

  const OfflineBanner({
    super.key,
    required this.isOffline,
    required this.syncStatus,
    this.toggleOffline,
  });

  @override
  Widget build(BuildContext context) {
    if (!isOffline && syncStatus == 'synced') return const SizedBox.shrink();

    final bg = isOffline ? const Color(0xFFEA580C) : const Color(0xFF0EA5E9);
    final text = isOffline
        ? 'FIELD MODE: LOCAL STORAGE'
        : 'SYNCING FIELD DATA...';

    return GestureDetector(
      onTap: toggleOffline,
      behavior: HitTestBehavior.opaque,
      child: Container(
        height: 40,
        padding: const EdgeInsets.symmetric(horizontal: 20),
        decoration: BoxDecoration(
          color: bg,
          border: Border(
            bottom: BorderSide(color: Colors.black.withOpacity(0.08)),
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Text(
                  isOffline ? '⚠️' : '🔄',
                  style: const TextStyle(fontSize: 14),
                ),
                const SizedBox(width: 10),
                Text(
                  text,
                  style: const TextStyle(
                    color: Color(0xFF0F172A),
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1,
                  ),
                ),
              ],
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: Colors.transparent,
                borderRadius: BorderRadius.circular(4),
                border: Border.all(color: Colors.black.withOpacity(0.2)),
              ),
              child: const Text(
                'LTE',
                style: TextStyle(
                  fontSize: 8,
                  fontWeight: FontWeight.w900,
                  color: Colors.black54,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
