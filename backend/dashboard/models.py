from django.db import models


class VillageReference(models.Model):
    name = models.CharField(max_length=150)
    commune = models.CharField(max_length=150, blank=True, null=True)
    fokontany = models.CharField(max_length=150, blank=True, null=True)
    region = models.CharField(max_length=150, blank=True, null=True, help_text="Région (ex: Antsiranana)")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("name", "commune", "fokontany")
        indexes = [
            models.Index(fields=["name"]),
            models.Index(fields=["commune"]),
            models.Index(fields=["fokontany"]),
            models.Index(fields=["region"]),
        ]
        ordering = ['region', 'commune', 'name']

    def __str__(self):
        parts = [self.name]
        if self.fokontany:
            parts.append(f"Fokontany: {self.fokontany}")
        if self.commune:
            parts.append(f"Commune: {self.commune}")
        if self.region:
            parts.append(f"Région: {self.region}")
        return " - ".join(parts)
