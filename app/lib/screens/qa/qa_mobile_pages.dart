import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/qa_provider.dart';
import 'qa_project_tasks_screen.dart';

class QADashboardContent extends ConsumerWidget {
  const QADashboardContent({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final projectsAsync = ref.watch(qaProjectsProvider);
    final currentOrgAsync = ref.watch(qaCurrentOrgProvider);

    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(qaProjectsProvider);
        ref.invalidate(qaCurrentOrgProvider);
      },
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 20),
            
            // 1. Organization Status
            currentOrgAsync.when(
              data: (org) => org == null 
                ? Container(
                    padding: const EdgeInsets.all(16),
                    margin: const EdgeInsets.only(bottom: 24),
                    decoration: BoxDecoration(
                      color: Colors.orange.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.orange.withOpacity(0.2)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.warning_amber_rounded, color: Colors.orange),
                        const SizedBox(width: 12),
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Not in Organization', style: TextStyle(fontWeight: FontWeight.bold)),
                              Text('Join an organization to start.', style: TextStyle(fontSize: 12)),
                            ],
                          ),
                        ),
                        TextButton(
                          onPressed: () => Navigator.pushNamed(context, '/qa-organization'),
                          child: const Text('CONTINUE'),
                        ),
                      ],
                    ),
                  )
                : Container(
                     padding: const EdgeInsets.all(16),
                    margin: const EdgeInsets.only(bottom: 24),
                    decoration: BoxDecoration(
                      color: Colors.green.withOpacity(0.05),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.green.withOpacity(0.1)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.business, color: Colors.green),
                        const SizedBox(width: 12),
                        Flexible(
                          child: Text(
                            org['name'] ?? 'Organization',
                            style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.green),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                ),
              loading: () => const SizedBox.shrink(),
              error: (_, __) => const SizedBox.shrink(),
            ),

            // 2. Projects Section
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Assignments',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                TextButton(
                  onPressed: () => Navigator.pushNamed(context, '/qa-join-project'),
                  child: const Text("Join Project"),
                )
              ],
            ),
            const SizedBox(height: 12),

            projectsAsync.when(
              data: (projects) {
                if (projects.isEmpty) {
                  return Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24.0),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.assignment_outlined, size: 48, color: Colors.grey.shade400),
                          const SizedBox(height: 16),
                          Text(
                            "No active assignments",
                            style: TextStyle(color: Colors.grey.shade600),
                          ),
                          const SizedBox(height: 8),
                          ElevatedButton(
                            onPressed: () => Navigator.pushNamed(context, '/qa-join-project'),
                            child: const Text("Join Project"),
                          )
                        ],
                      ),
                    ),
                  );
                }
                return ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: projects.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    final project = projects[index];
                    return _ProjectCard(project: project);
                  },
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (err, _) => Text('Error: $err'),
            ),
            
            const SizedBox(height: 80),
          ],
        ),
      ),
    );
  }
}

class _ProjectCard extends StatelessWidget {
  final dynamic project;
  const _ProjectCard({required this.project});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      child: InkWell(
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => QAProjectTasksScreen(
                projectId: project['id'], 
                projectName: project['name']
              ),
            ),
          );
        },
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
               Container(
                 padding: const EdgeInsets.all(10),
                 decoration: BoxDecoration(
                   color: Colors.blue.withOpacity(0.1),
                   borderRadius: BorderRadius.circular(12),
                 ),
                 child: const Icon(Icons.assignment, color: Colors.blue),
               ),
               const SizedBox(width: 16),
               Expanded(
                 child: Column(
                   crossAxisAlignment: CrossAxisAlignment.start,
                   children: [
                     Text(project['name'], style: const TextStyle(fontWeight: FontWeight.bold)),
                     if (project['location_text'] != null)
                        Text(project['location_text'], style: const TextStyle(fontSize: 12, color: Colors.grey)),
                   ],
                 ),
               ),
               const Icon(Icons.chevron_right, color: Colors.grey),
            ],
          ),
        ),
      ),
    );
  }
}


