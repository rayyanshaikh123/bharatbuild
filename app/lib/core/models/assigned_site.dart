class AssignedSite {
  final String siteId;
  final String siteName;
  final List<List<double>> polygon; // [[lat, lng], ...]

  AssignedSite({
    required this.siteId,
    required this.siteName,
    required this.polygon,
  });

  factory AssignedSite.fromJson(Map<String, dynamic> json) {
    final coords = (json['geo_fence']?['coordinates'] as List<dynamic>?) ?? [];
    final poly = coords
        .map<List<double>>((pt) => [pt[0] as double, pt[1] as double])
        .toList();
    return AssignedSite(
      siteId: json['site_id'] as String,
      siteName: json['site_name'] as String,
      polygon: poly,
    );
  }
}
