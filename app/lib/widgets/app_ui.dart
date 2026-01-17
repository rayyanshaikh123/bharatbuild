import 'package:flutter/material.dart';
import '../theme.dart';

class AppHeader extends StatelessWidget implements PreferredSizeWidget {
  final String title;
  const AppHeader({super.key, required this.title});

  @override
  Widget build(BuildContext context) {
    return AppBar(
      title: Text(title),
      elevation: 0,
      backgroundColor: Colors.transparent,
      foregroundColor: AppTheme.brandNavy,
      centerTitle: false,
      flexibleSpace: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [
              AppTheme.surface.withOpacity(0.95),
              AppTheme.surface.withOpacity(0.85),
            ],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
          border: Border(bottom: BorderSide(color: AppTheme.cardBorder)),
        ),
      ),
    );
  }

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);
}

class WebCard extends StatelessWidget {
  final String title;
  final String? subtitle;
  final String? status;
  final VoidCallback? onTap;
  const WebCard({
    super.key,
    required this.title,
    this.subtitle,
    this.onTap,
    this.status,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.cardBorder),
        boxShadow: [
          BoxShadow(
            color: const Color.fromRGBO(2, 6, 23, 0.06),
            blurRadius: 20,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(14),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            child: Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: AppTheme.brandOrange.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.work, color: AppTheme.brandNavy),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.2,
                          fontSize: 15,
                        ),
                      ),
                      if (subtitle != null) ...[
                        const SizedBox(height: 6),
                        Text(
                          subtitle!,
                          style: const TextStyle(
                            color: AppTheme.muted,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                if (status != null)
                  Padding(
                    padding: const EdgeInsets.only(right: 8.0),
                    child: StatusBadge(status: status!),
                  ),
                const Icon(Icons.chevron_right, color: Colors.grey),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class StatusBadge extends StatelessWidget {
  final String status;
  const StatusBadge({super.key, required this.status});

  Color _bg(String s) {
    switch (s.toUpperCase()) {
      case 'ACTIVE':
        return const Color.fromRGBO(16, 185, 129, 0.08);
      case 'DELAYED':
        return const Color.fromRGBO(239, 68, 68, 0.06);
      case 'COMPLETE':
        return const Color.fromRGBO(59, 130, 246, 0.06);
      case 'PENDING':
        return const Color.fromRGBO(245, 158, 11, 0.06);
      case 'APPROVED':
        return const Color.fromRGBO(99, 102, 241, 0.06);
      default:
        return Colors.grey.withOpacity(0.08);
    }
  }

  Color _fg(String s) {
    switch (s.toUpperCase()) {
      case 'ACTIVE':
        return const Color(0xFF059669);
      case 'DELAYED':
        return const Color(0xFFDC2626);
      case 'COMPLETE':
        return const Color(0xFF2563EB);
      case 'PENDING':
        return const Color(0xFFB45309);
      case 'APPROVED':
        return const Color(0xFF4F46E5);
      default:
        return AppTheme.muted;
    }
  }

  @override
  Widget build(BuildContext context) {
    final upper = status.toUpperCase();
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: _bg(status),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: _fg(status).withOpacity(0.12)),
      ),
      child: Text(
        upper,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w800,
          color: _fg(status),
        ),
      ),
    );
  }
}

class PrimaryButton extends StatelessWidget {
  final String label;
  final VoidCallback onPressed;
  const PrimaryButton({
    super.key,
    required this.label,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return ElevatedButton.icon(
      onPressed: onPressed,
      icon: const Icon(Icons.open_in_new),
      label: Text(label, style: const TextStyle(fontWeight: FontWeight.w800)),
      style: ElevatedButton.styleFrom(
        backgroundColor: AppTheme.brandOrange,
        elevation: 18,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        shadowColor: AppTheme.brandOrange.withOpacity(0.18),
      ),
    );
  }
}
