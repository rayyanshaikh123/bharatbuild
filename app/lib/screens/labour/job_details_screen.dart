import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../providers/job_provider.dart';
import '../../theme/app_colors.dart';

class JobDetailsScreen extends ConsumerWidget {
  final String jobId;

  const JobDetailsScreen({super.key, required this.jobId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final jobAsync = ref.watch(jobDetailsProvider(jobId));
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text('job_details'.tr()),
        elevation: 0,
        backgroundColor: Colors.transparent,
        foregroundColor: theme.colorScheme.onSurface,
      ),
      extendBodyBehindAppBar: true,
      bottomNavigationBar: jobAsync.when(
        data: (job) => _buildBottomAction(context, ref, job),
        loading: () => const SizedBox.shrink(),
        error: (_, __) => const SizedBox.shrink(),
      ),
      body: jobAsync.when(
        data: (job) => _buildContent(context, job, theme),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Error: $err')),
      ),
    );
  }

  Widget _buildContent(BuildContext context, Map<String, dynamic> data, ThemeData theme) {
    final job = data['job'] ?? {};
    final wageOptions = data['wage_options'] as List<dynamic>? ?? [];

    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Map Placeholder / Header
          Container(
            height: 250,
            width: double.infinity,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  theme.colorScheme.primary.withOpacity(0.12),
                  theme.colorScheme.primary.withOpacity(0.02),
                ],
              ),
            ),
            child: Stack(
              children: [
                Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: theme.colorScheme.primary.withOpacity(0.1),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(Icons.location_on_rounded, size: 48, color: theme.colorScheme.primary),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'site_location'.tr(),
                        style: theme.textTheme.titleSmall?.copyWith(
                          color: theme.colorScheme.primary,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 1.2,
                        ),
                      ),
                    ],
                  ),
                ),
                // Floating Category Badge
                Positioned(
                  bottom: 24,
                  left: 24,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.primary,
                      borderRadius: BorderRadius.circular(14),
                      boxShadow: [
                        BoxShadow(color: theme.colorScheme.primary.withOpacity(0.3), blurRadius: 10, offset: const Offset(0, 4)),
                      ],
                    ),
                    child: Text(
                      job['category']?.toString().toUpperCase() ?? 'GENERAL',
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13, letterSpacing: 0.5),
                    ),
                  ),
                ),
              ],
            ),
          ),

          Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            job['project_name'] ?? 'Project Name',
                            style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Icon(Icons.location_on_outlined, size: 20, color: theme.colorScheme.primary.withOpacity(0.6)),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  job['location_text'] ?? 'Unknown location',
                                  style: theme.textTheme.bodyMedium?.copyWith(
                                    color: theme.colorScheme.onSurface.withOpacity(0.6),
                                    height: 1.4,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    if (job['budget'] != null)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: Colors.green.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          '₹${NumberFormat.compact().format(double.tryParse(job['budget'].toString()) ?? 0)}',
                          style: const TextStyle(color: Colors.green, fontWeight: FontWeight.bold),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 32),
                
                _sectionTitle(theme, 'wages_for_category'.tr(args: [job['category']?.toString() ?? ''])),
                const SizedBox(height: 16),
                if (wageOptions.isEmpty)
                  Text('no_wages_set'.tr(), style: const TextStyle(fontStyle: FontStyle.italic, color: Colors.grey))
                else
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.grey[50],
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.grey[200]!),
                    ),
                    child: Column(
                      children: wageOptions.map((w) {
                        final isMySkill = w['skill_type'] == job['skill_type'];
                        return Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            border: w == wageOptions.last ? null : Border(bottom: BorderSide(color: Colors.grey[200]!)),
                            color: isMySkill ? theme.colorScheme.primary.withOpacity(0.05) : null,
                            borderRadius: isMySkill && w == wageOptions.first 
                                ? const BorderRadius.vertical(top: Radius.circular(20))
                                : isMySkill && w == wageOptions.last
                                    ? const BorderRadius.vertical(bottom: Radius.circular(20))
                                    : null,
                          ),
                          child: Row(
                            children: [
                              CircleAvatar(
                                radius: 4,
                                backgroundColor: isMySkill ? theme.colorScheme.primary : Colors.grey[400],
                              ),
                              const SizedBox(width: 12),
                              Text(
                                w['skill_type']?.toString().replaceAll('_', ' ') ?? '',
                                style: TextStyle(
                                  fontWeight: isMySkill ? FontWeight.bold : FontWeight.normal,
                                  color: isMySkill ? theme.colorScheme.primary : Colors.black87,
                                ),
                              ),
                              const Spacer(),
                              Text(
                                '₹${w['hourly_rate']}/hr',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                  color: isMySkill ? theme.colorScheme.primary : Colors.black,
                                ),
                              ),
                            ],
                          ),
                        );
                      }).toList(),
                    ),
                  ),

                const SizedBox(height: 32),
                _sectionTitle(theme, 'job_description'.tr()),
                const SizedBox(height: 12),
                Text(
                  job['project_description'] ?? 'No description available for this project.',
                  style: theme.textTheme.bodyLarge?.copyWith(height: 1.6, color: Colors.black87),
                ),
                
                const SizedBox(height: 32),
                _sectionTitle(theme, 'requirements'.tr()),
                const SizedBox(height: 16),
                _requirementRow(Icons.people_alt_outlined, '${job['required_count']} workers needed'),
                _requirementRow(Icons.calendar_month_outlined, 'Starting: ${job['request_date']?.toString().split('T')[0] ?? 'ASAP'}'),
                
                const SizedBox(height: 100), // Padding for bottom FAB
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _sectionTitle(ThemeData theme, String title) {
    return Text(
      title,
      style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
    );
  }

  Widget _requirementRow(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12.0),
      child: Row(
        children: [
          Icon(icon, size: 20, color: AppColors.primary),
          const SizedBox(width: 12),
          Text(text, style: const TextStyle(fontSize: 16)),
        ],
      ),
    );
  }

  Widget _buildBottomAction(BuildContext context, WidgetRef ref, Map<String, dynamic> data) {
    final job = data['job'] ?? {};
    final canApply = job['can_apply'] ?? true;
    
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Theme.of(context).scaffoldBackgroundColor,
        border: Border(top: BorderSide(color: Theme.of(context).dividerColor.withOpacity(0.1))),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (!canApply)
            Padding(
              padding: const EdgeInsets.only(bottom: 12.0),
              child: Text(
                'too_far_to_apply'.tr(),
                style: const TextStyle(color: Colors.red, fontWeight: FontWeight.bold),
              ),
            ),
          ElevatedButton(
            onPressed: canApply ? () => _handleApply(context, ref, job) : null,
            style: ElevatedButton.styleFrom(
              minimumSize: const Size(double.infinity, 56),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              elevation: 0,
            ),
            child: Text(
              canApply ? 'apply_now'.tr() : 'cannot_apply'.tr(),
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _handleApply(BuildContext context, WidgetRef ref, Map<String, dynamic> job) async {
    try {
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (_) => const Center(child: CircularProgressIndicator()),
      );
      
      await ref.read(applyForJobProvider(job['id'].toString()).future);
      
      if (context.mounted) {
        Navigator.pop(context); // Close loading
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('applied_successfully'.tr()),
            backgroundColor: Colors.green,
            behavior: SnackBarBehavior.floating,
          ),
        );
        Navigator.pop(context); // Go back to feed
      }
    } catch (e) {
      if (context.mounted) {
        Navigator.pop(context); // Close loading
        
        // Clean up error message
        String msg = e.toString();
        if (msg.contains('Exception:')) {
          msg = msg.split('Exception:').last.trim();
        }
        if (msg.contains(':')) {
           msg = msg.split(':').last.trim();
        }

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(msg),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }
}
