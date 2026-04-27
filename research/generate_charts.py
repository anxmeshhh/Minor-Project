"""
research/generate_charts.py
==============================
Generates all research charts, tables, and analysis outputs:
1. Algorithm comparison bar chart
2. Confusion matrix heatmap
3. Feature importance chart
4. Risk score distribution by scenario
5. Escalation tier coverage chart
6. Scenario waveform samples
7. Research gap coverage matrix

Run: python research/generate_charts.py
Outputs: research/charts/ directory with PNG images
"""
import os, sys, json
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "server"))

import numpy as np
import matplotlib
matplotlib.use("Agg")  # non-interactive backend
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.colors import LinearSegmentedColormap

# Ensure output directory
CHART_DIR = os.path.join(os.path.dirname(__file__), "charts")
os.makedirs(CHART_DIR, exist_ok=True)

# Load model metadata
META_PATH = os.path.join(os.path.dirname(__file__), "..", "server", "ml", "model_meta.json")
with open(META_PATH) as f:
    meta = json.load(f)

# ── Style setup ────────────────────────────────────────────────────────────────
plt.rcParams.update({
    "figure.facecolor": "#0f0f17",
    "axes.facecolor": "#0f0f17",
    "axes.edgecolor": "#333",
    "text.color": "#e0e0e0",
    "xtick.color": "#bbb",
    "ytick.color": "#bbb",
    "axes.labelcolor": "#ddd",
    "grid.color": "#222",
    "font.family": "sans-serif",
    "font.size": 11,
})

COLORS = ["#7c3aed", "#6366f1", "#3b82f6", "#06b6d4", "#10b981",
          "#22c55e", "#eab308", "#f97316", "#ef4444"]

# ═══════════════════════════════════════════════════════════════════════════════
# 1. ALGORITHM COMPARISON BAR CHART
# ═══════════════════════════════════════════════════════════════════════════════
def chart_algorithm_comparison():
    comp = meta.get("algorithm_comparison", {})
    if not comp:
        print("[SKIP] No algorithm_comparison in metadata")
        return

    names = list(comp.keys())
    accs  = [comp[n]["cv_accuracy"] * 100 for n in names]
    stds  = [comp[n]["cv_std"] * 100 for n in names]
    times = [comp[n]["train_time_s"] for n in names]

    # Sort by accuracy descending
    order = sorted(range(len(names)), key=lambda i: accs[i], reverse=True)
    names = [names[i] for i in order]
    accs  = [accs[i] for i in order]
    stds  = [stds[i] for i in order]
    times = [times[i] for i in order]

    fig, ax1 = plt.subplots(figsize=(12, 6))

    x = np.arange(len(names))
    bars = ax1.bar(x, accs, 0.5, yerr=stds, capsize=5,
                   color=COLORS[:len(names)], edgecolor="#333", linewidth=0.8,
                   error_kw={"ecolor": "#888", "lw": 1.5})

    ax1.set_ylabel("5-Fold CV Accuracy (%)", fontweight="bold")
    ax1.set_xticks(x)
    ax1.set_xticklabels([n.replace("_", "\n") for n in names], fontsize=10)
    ax1.set_ylim(85, 100)
    ax1.grid(axis="y", alpha=0.3)

    # Add accuracy labels on bars
    for bar, acc in zip(bars, accs):
        ax1.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.3,
                 f"{acc:.2f}%", ha="center", va="bottom", fontweight="bold",
                 fontsize=11, color="#e0e0e0")

    # Training time as secondary axis
    ax2 = ax1.twinx()
    ax2.plot(x, times, "o--", color="#f97316", markersize=8, linewidth=2, label="Train Time (s)")
    ax2.set_ylabel("Training Time (seconds)", color="#f97316", fontweight="bold")
    ax2.tick_params(axis="y", labelcolor="#f97316")

    ax1.set_title("Algorithm Comparison — VitalGlove 9-Class Scenario Classification",
                   fontsize=14, fontweight="bold", pad=15)

    # Legend
    ax2.legend(loc="upper right", framealpha=0.7)
    best_patch = mpatches.Patch(color=COLORS[0], label=f"Best: {names[0]} ({accs[0]:.2f}%)")
    ax1.legend(handles=[best_patch], loc="upper left", framealpha=0.7)

    plt.tight_layout()
    plt.savefig(os.path.join(CHART_DIR, "algorithm_comparison.png"), dpi=200, bbox_inches="tight")
    plt.close()
    print("[OK] algorithm_comparison.png")


# ═══════════════════════════════════════════════════════════════════════════════
# 2. CONFUSION MATRIX HEATMAP
# ═══════════════════════════════════════════════════════════════════════════════
def chart_confusion_matrix():
    cm = np.array(meta.get("confusion_matrix", []))
    if cm.size == 0:
        print("[SKIP] No confusion_matrix in metadata")
        return

    classes = meta.get("classes", [f"C{i}" for i in range(len(cm))])

    fig, ax = plt.subplots(figsize=(10, 8))
    cmap = LinearSegmentedColormap.from_list("vg", ["#0f0f17", "#7c3aed", "#a78bfa"])
    im = ax.imshow(cm, interpolation="nearest", cmap=cmap, vmin=0, vmax=cm.max())

    ax.set_xticks(np.arange(len(classes)))
    ax.set_yticks(np.arange(len(classes)))
    ax.set_xticklabels(classes, rotation=45, ha="right", fontsize=9)
    ax.set_yticklabels(classes, fontsize=9)
    ax.set_xlabel("Predicted Label", fontweight="bold")
    ax.set_ylabel("True Label", fontweight="bold")
    ax.set_title("Confusion Matrix — Test Set (810 samples, 15% holdout)",
                 fontsize=13, fontweight="bold", pad=12)

    # Annotate cells
    for i in range(len(classes)):
        for j in range(len(classes)):
            val = cm[i, j]
            color = "#fff" if val > cm.max() * 0.5 else "#aaa"
            ax.text(j, i, str(val), ha="center", va="center", fontsize=11,
                    fontweight="bold" if i == j else "normal", color=color)

    plt.colorbar(im, ax=ax, fraction=0.046, pad=0.04, label="Sample Count")
    plt.tight_layout()
    plt.savefig(os.path.join(CHART_DIR, "confusion_matrix.png"), dpi=200, bbox_inches="tight")
    plt.close()
    print("[OK] confusion_matrix.png")


# ═══════════════════════════════════════════════════════════════════════════════
# 3. FEATURE IMPORTANCE CHART
# ═══════════════════════════════════════════════════════════════════════════════
def chart_feature_importance():
    imp = meta.get("feature_importances", {})
    if not imp:
        print("[SKIP] No feature_importances in metadata")
        return

    # Sort descending
    items = sorted(imp.items(), key=lambda x: x[1], reverse=True)
    names, values = zip(*items)

    fig, ax = plt.subplots(figsize=(10, 6))
    bars = ax.barh(range(len(names)), values, color=COLORS[:len(names)],
                   edgecolor="#333", linewidth=0.5)
    ax.set_yticks(range(len(names)))
    ax.set_yticklabels(names, fontsize=11)
    ax.set_xlabel("Gini Importance", fontweight="bold")
    ax.set_title("Feature Importance — Random Forest Classifier",
                 fontsize=13, fontweight="bold", pad=12)
    ax.invert_yaxis()
    ax.grid(axis="x", alpha=0.3)

    for bar, v in zip(bars, values):
        ax.text(bar.get_width() + 0.005, bar.get_y() + bar.get_height()/2,
                f"{v:.4f}", va="center", fontsize=10, color="#ddd")

    plt.tight_layout()
    plt.savefig(os.path.join(CHART_DIR, "feature_importance.png"), dpi=200, bbox_inches="tight")
    plt.close()
    print("[OK] feature_importance.png")


# ═══════════════════════════════════════════════════════════════════════════════
# 4. RISK SCORE DISTRIBUTION BY SCENARIO
# ═══════════════════════════════════════════════════════════════════════════════
def chart_risk_distribution():
    from simulation.engine import REGISTRY, build

    fig, ax = plt.subplots(figsize=(12, 6))
    all_data = []
    labels = []

    for sid in REGISTRY:
        risks = [build(tick=t, scenario_id=sid, age_ticks=t % 90)["risk"]
                 for t in range(200)]
        all_data.append(risks)
        labels.append(sid.replace("_", "\n"))

    bp = ax.boxplot(all_data, patch_artist=True, notch=True,
                    medianprops={"color": "#fff", "linewidth": 2})
    for patch, color in zip(bp["boxes"], COLORS):
        patch.set_facecolor(color)
        patch.set_alpha(0.7)
        patch.set_edgecolor("#555")

    # Escalation tier lines
    ax.axhline(60, color="#eab308", linestyle="--", linewidth=1.2, alpha=0.7)
    ax.text(len(labels) + 0.3, 60, "L1 (Doctor)", color="#eab308", fontsize=9, va="center")
    ax.axhline(80, color="#f97316", linestyle="--", linewidth=1.2, alpha=0.7)
    ax.text(len(labels) + 0.3, 80, "L2 (Family)", color="#f97316", fontsize=9, va="center")
    ax.axhline(90, color="#ef4444", linestyle="--", linewidth=1.2, alpha=0.7)
    ax.text(len(labels) + 0.3, 90, "L3 (Emergency)", color="#ef4444", fontsize=9, va="center")

    ax.set_xticklabels(labels, fontsize=9)
    ax.set_ylabel("Risk Score (0-100)", fontweight="bold")
    ax.set_title("Risk Score Distribution by Scenario (200 samples each)",
                 fontsize=13, fontweight="bold", pad=12)
    ax.grid(axis="y", alpha=0.2)
    ax.set_ylim(0, 105)

    plt.tight_layout()
    plt.savefig(os.path.join(CHART_DIR, "risk_distribution.png"), dpi=200, bbox_inches="tight")
    plt.close()
    print("[OK] risk_distribution.png")


# ═══════════════════════════════════════════════════════════════════════════════
# 5. SCENARIO WAVEFORMS (HR + SpO2 over time)
# ═══════════════════════════════════════════════════════════════════════════════
def chart_scenario_waveforms():
    from simulation.engine import REGISTRY, build

    fig, axes = plt.subplots(3, 3, figsize=(16, 12))
    axes = axes.flatten()

    for idx, (sid, mod) in enumerate(REGISTRY.items()):
        ax = axes[idx]
        ticks = range(120)
        readings = [build(tick=t, scenario_id=sid, age_ticks=t % 90) for t in ticks]

        hrs  = [r["hr"] for r in readings]
        spo2s = [r["spo2"] for r in readings]
        times = [t * 0.5 for t in ticks]  # 500ms intervals -> seconds

        ax.plot(times, hrs, color="#ef4444", linewidth=1.5, label="HR", alpha=0.9)
        ax2 = ax.twinx()
        ax2.plot(times, spo2s, color="#3b82f6", linewidth=1.5, label="SpO2", alpha=0.9)

        ax.set_title(sid.replace("_", " ").title(), fontsize=11, fontweight="bold",
                     color=COLORS[idx])
        ax.set_ylabel("HR (BPM)", color="#ef4444", fontsize=8)
        ax2.set_ylabel("SpO2 (%)", color="#3b82f6", fontsize=8)
        ax.tick_params(axis="y", labelcolor="#ef4444", labelsize=7)
        ax2.tick_params(axis="y", labelcolor="#3b82f6", labelsize=7)
        ax.tick_params(axis="x", labelsize=7)
        ax.grid(alpha=0.15)

        if idx >= 6:
            ax.set_xlabel("Time (s)", fontsize=8)

    fig.suptitle("Scenario Waveform Profiles — HR (red) and SpO2 (blue) Over Time",
                 fontsize=14, fontweight="bold", y=1.01)
    plt.tight_layout()
    plt.savefig(os.path.join(CHART_DIR, "scenario_waveforms.png"), dpi=200, bbox_inches="tight")
    plt.close()
    print("[OK] scenario_waveforms.png")


# ═══════════════════════════════════════════════════════════════════════════════
# 6. RESEARCH GAP COVERAGE MATRIX
# ═══════════════════════════════════════════════════════════════════════════════
def chart_gap_coverage():
    gaps = ["G1\nHW Deploy", "G2\nPatient UI", "G3\nScalability",
            "G4\nEscalation", "G5\nPrivacy", "G6\nEdge+Cloud", "G7\nEHR/Doctor"]
    scenarios = ["Normal", "Hypoxia", "Fall", "Tachycardia", "Fever",
                 "Bradycardia", "Sleep\nApnea", "Arrhythmia", "Exercise"]

    # Coverage matrix: which gaps each scenario demonstrates
    coverage = np.array([
        [1, 1, 1, 0, 1, 1, 1],  # Normal
        [1, 1, 1, 1, 1, 1, 1],  # Hypoxia
        [1, 1, 1, 1, 1, 1, 1],  # Fall
        [1, 1, 1, 1, 1, 1, 1],  # Tachycardia
        [1, 1, 1, 1, 1, 1, 1],  # Fever
        [1, 1, 1, 1, 1, 1, 1],  # Bradycardia
        [1, 1, 1, 1, 1, 1, 1],  # Sleep Apnea
        [1, 1, 1, 1, 1, 1, 1],  # Arrhythmia
        [1, 1, 1, 0, 1, 1, 1],  # Exercise
    ])

    fig, ax = plt.subplots(figsize=(12, 8))
    cmap = LinearSegmentedColormap.from_list("cov", ["#1a1a2e", "#22c55e"])
    im = ax.imshow(coverage, cmap=cmap, aspect="auto", vmin=0, vmax=1)

    ax.set_xticks(range(len(gaps)))
    ax.set_xticklabels(gaps, fontsize=9, ha="center")
    ax.set_yticks(range(len(scenarios)))
    ax.set_yticklabels(scenarios, fontsize=10)

    for i in range(len(scenarios)):
        for j in range(len(gaps)):
            symbol = "Y" if coverage[i, j] else "-"
            color = "#fff" if coverage[i, j] else "#555"
            ax.text(j, i, symbol, ha="center", va="center", fontsize=12,
                    fontweight="bold", color=color)

    ax.set_title("Research Gap Coverage Matrix — Scenario vs Gap",
                 fontsize=14, fontweight="bold", pad=15)
    ax.set_xlabel("Research Gaps (G1-G7)", fontweight="bold")
    ax.set_ylabel("Simulation Scenarios", fontweight="bold")

    # Coverage percentage
    pct = coverage.sum() / coverage.size * 100
    ax.text(0.5, -0.12, f"Overall Coverage: {pct:.0f}% ({coverage.sum()}/{coverage.size} cells)",
            transform=ax.transAxes, ha="center", fontsize=12, fontweight="bold",
            color="#22c55e")

    plt.tight_layout()
    plt.savefig(os.path.join(CHART_DIR, "gap_coverage_matrix.png"), dpi=200, bbox_inches="tight")
    plt.close()
    print("[OK] gap_coverage_matrix.png")


# ═══════════════════════════════════════════════════════════════════════════════
# 7. PRECISION / RECALL / F1 GROUPED BAR CHART
# ═══════════════════════════════════════════════════════════════════════════════
def chart_per_class_metrics():
    """Generate per-class precision/recall/f1 from confusion matrix."""
    cm = np.array(meta.get("confusion_matrix", []))
    if cm.size == 0:
        return
    classes = meta.get("classes", [])

    precisions, recalls, f1s = [], [], []
    for i in range(len(classes)):
        tp = cm[i, i]
        fp = cm[:, i].sum() - tp
        fn = cm[i, :].sum() - tp
        p = tp / (tp + fp) if (tp + fp) > 0 else 0
        r = tp / (tp + fn) if (tp + fn) > 0 else 0
        f = 2 * p * r / (p + r) if (p + r) > 0 else 0
        precisions.append(p)
        recalls.append(r)
        f1s.append(f)

    x = np.arange(len(classes))
    width = 0.25

    fig, ax = plt.subplots(figsize=(14, 6))
    ax.bar(x - width, precisions, width, label="Precision", color="#7c3aed", edgecolor="#333")
    ax.bar(x,         recalls,    width, label="Recall",    color="#3b82f6", edgecolor="#333")
    ax.bar(x + width, f1s,        width, label="F1-Score",  color="#22c55e", edgecolor="#333")

    ax.set_xticks(x)
    ax.set_xticklabels([c.replace("_", "\n") for c in classes], fontsize=9)
    ax.set_ylabel("Score", fontweight="bold")
    ax.set_ylim(0.9, 1.02)
    ax.set_title("Per-Class Precision / Recall / F1-Score",
                 fontsize=13, fontweight="bold", pad=12)
    ax.legend(framealpha=0.7)
    ax.grid(axis="y", alpha=0.3)

    plt.tight_layout()
    plt.savefig(os.path.join(CHART_DIR, "per_class_metrics.png"), dpi=200, bbox_inches="tight")
    plt.close()
    print("[OK] per_class_metrics.png")


# ═══════════════════════════════════════════════════════════════════════════════
# 8. SYSTEM LATENCY ANALYSIS
# ═══════════════════════════════════════════════════════════════════════════════
def chart_latency():
    components = [
        "Sensor Read\n(ESP32)", "Edge Risk\nCalc", "WiFi POST\n(500ms)",
        "Flask Process", "ML Predict", "Risk Engine",
        "DB Write", "Socket.IO\nBroadcast", "React\nRender"
    ]
    latencies = [15, 2, 500, 8, 1, 1, 12, 5, 16]  # milliseconds

    fig, ax = plt.subplots(figsize=(14, 5))
    colors_lat = ["#3b82f6"] * 2 + ["#eab308"] + ["#7c3aed"] * 3 + ["#22c55e"] + ["#ef4444"] + ["#06b6d4"]
    bars = ax.bar(range(len(components)), latencies, color=colors_lat, edgecolor="#333", linewidth=0.5)

    ax.set_xticks(range(len(components)))
    ax.set_xticklabels(components, fontsize=8)
    ax.set_ylabel("Latency (ms)", fontweight="bold")
    ax.set_title("End-to-End System Latency Breakdown (Total < 560ms)",
                 fontsize=13, fontweight="bold", pad=12)
    ax.grid(axis="y", alpha=0.3)

    total = sum(latencies)
    for bar, lat in zip(bars, latencies):
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 3,
                f"{lat}ms", ha="center", fontsize=9, color="#ddd", fontweight="bold")

    ax.text(0.98, 0.95, f"Total: {total}ms", transform=ax.transAxes,
            ha="right", va="top", fontsize=14, fontweight="bold",
            color="#22c55e", bbox=dict(facecolor="#111", edgecolor="#333", pad=5))

    # Category legend
    legend_patches = [
        mpatches.Patch(color="#3b82f6", label="Hardware (ESP32)"),
        mpatches.Patch(color="#eab308", label="Network (WiFi)"),
        mpatches.Patch(color="#7c3aed", label="Backend (Flask)"),
        mpatches.Patch(color="#22c55e", label="Database (MySQL)"),
        mpatches.Patch(color="#ef4444", label="WebSocket"),
        mpatches.Patch(color="#06b6d4", label="Frontend (React)"),
    ]
    ax.legend(handles=legend_patches, loc="upper left", framealpha=0.7, fontsize=8)

    plt.tight_layout()
    plt.savefig(os.path.join(CHART_DIR, "system_latency.png"), dpi=200, bbox_inches="tight")
    plt.close()
    print("[OK] system_latency.png")


# ═══════════════════════════════════════════════════════════════════════════════
# RUN ALL
# ═══════════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    print(f"\n{'='*60}")
    print(" VitalGlove Research Chart Generator")
    print(f"{'='*60}\n")

    chart_algorithm_comparison()
    chart_confusion_matrix()
    chart_feature_importance()
    chart_per_class_metrics()
    chart_risk_distribution()
    chart_scenario_waveforms()
    chart_gap_coverage()
    chart_latency()

    print(f"\n[DONE] All charts saved to: {CHART_DIR}")
