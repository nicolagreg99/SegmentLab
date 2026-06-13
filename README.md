# SegmentLab

Personal cycling performance analysis tool built around GPX files. Upload a ride and SegmentLab automatically detects every significant climb, tracks your times across sessions, and lets you compare efforts over time — without subscriptions, without giving your data to third parties.

---

## The problem it solves

Platforms like Strava detect segments based on community submissions. You can only compare yourself against others on segments other people decided to create. SegmentLab flips this: every climb you ride gets detected automatically from your own GPS trace and becomes a private segment you own.

---

## Technical overview

SegmentLab is a full-stack TypeScript application with a single Next.js codebase covering both frontend and backend. The architecture is deliberately simple — no microservices, no message queues, no unnecessary abstraction. Everything is in one repo, deployable to a single Vercel project with a Postgres database on Supabase.

| Layer | Technology | Rationale |
|---|---|---|
| Frontend + API | Next.js 15 (App Router) | Server components, API routes, and streaming in one framework |
| Language | TypeScript | End-to-end type safety from database schema to UI props |
| Styling | Tailwind CSS | No context switching between CSS files and components |
| Maps | MapLibre GL JS + OpenFreeMap | Fully open source, zero API costs, self-hostable tiles |
| Charts | Recharts | Composable, works natively with React |
| Database | PostgreSQL | Reliable, well-understood, supported everywhere |
| ORM | Prisma | Schema-as-code, typed queries, automatic migrations |

---

## Climb detection algorithm

The core of SegmentLab is the climb detector in `lib/segments/detector.ts`. It does not simply threshold on gradient — that approach breaks down on real GPS data because of noise and short flat sections inside climbs.

The algorithm works in four stages:

**1. Gaussian smoothing.** Raw GPS elevation data is noisy. Instead of a simple moving average, gradient is computed using a weighted Gaussian kernel (σ=3, half-window of 8 points). Points closer to the center of the window contribute more to the gradient estimate. This eliminates false positives from GPS jitter without over-smoothing real terrain changes.

**2. Hysteresis thresholding.** Entry into a climb requires gradient ≥ 3%. Exit only triggers below 1%. This two-threshold approach (standard in signal processing) means a brief 1.5% false flat inside a climb does not prematurely close the segment.

**3. Flat section tolerance.** If gradient drops below the exit threshold but recovers within 200 meters, the flat section is absorbed into the climb rather than splitting it. This handles roundabouts, traffic lights, and false flats correctly.

**4. Segment merging.** Two detected climbs separated by less than 150 meters of flat are merged into one. This covers the common case of a climb interrupted by a brief descent or junction.

Elevation gain is computed using the trapezoidal method rather than simple start-to-end difference, which is more accurate on oscillating GPS elevation profiles. Maximum gradient is computed over a rolling 10-point window to avoid single-point spikes from GPS error.

---

## Duplicate segment matching

When a GPX file is uploaded, detected climbs are matched against existing segments in the database using a three-condition proximity check rather than exact coordinate matching (which would always fail across different GPS traces of the same road):

- Start point within 100 meters
- End point within 100 meters  
- Total length within 20% of the existing segment

If all three conditions match, the upload creates a new effort against the existing segment rather than a duplicate. This is how Strava's segment matching works conceptually, implemented here without the proprietary overhead.

---

## Algorithmic Details and Mathematical Formulas

To ensure maximum robustness and precision in climb detection and track parameter calculation, SegmentLab employs advanced algorithms based on mathematical principles and signal processing. The key formulas and methodologies are outlined below.

### 1. Gaussian Gradient Smoothing

Inherent noise in GPS elevation data can lead to spurious fluctuations in gradient calculations. To mitigate this, Gaussian smoothing is applied. Instead of a simple moving average, which assigns equal weight to all points within a window, Gaussian smoothing weights points based on their proximity to the center point using a Gaussian distribution function. The parameters used are a standard deviation (σ) of 3 points and a half-window of 8 points (totaling 17 points in the window).

The **Gaussian kernel** `k` for a point `i` within a window of size `2H + 1` (where `H` is `GAUSSIAN_HALF_WIN`) is calculated as:

$$ k_j = e^{-\frac{j^2}{2\sigma^2}} $$

where `j` ranges from `-H` to `H`. These values are then normalized so that their sum equals 1.

The **Gaussian gradient** for a point `P_idx` is calculated as the weighted sum of elevation changes (`rise`) and distances (`run`) between points within the window, divided by the weighted sum of distances, and multiplied by 100 to obtain the percentage:

$$ \text{Gradient}(P_{\text{idx}}) = \left( \frac{\sum_{k=0}^{\text{kernel.length}-1} w_k \cdot \Delta \text{elev}_k}{\sum_{k=0}^{\text{kernel.length}-1} w_k \cdot \Delta \text{dist}_k} \right) \times 100 \% $$

where `w_k` is the Gaussian kernel weight for point `k`, `Δelev_k` is the elevation change, and `Δdist_k` is the distance change between consecutive points within the window.

### 2. Total Elevation Gain Calculation (Trapezoidal Method)

The total elevation gain of a climb is not simply the difference between the final and initial elevation, as this would ignore terrain undulations within the segment. SegmentLab uses a variant of the **trapezoidal method** that sums only positive elevation gains between consecutive points. This approach is more accurate for noisy GPS data and better reflects the actual elevation gained. The formula is as follows:

$$ \text{Total Elevation Gain} = \sum_{i=1}^{N-1} \max(0, \text{elev}_i - \text{elev}_{i-1}) $$

where `N` is the total number of points in the segment and `elev_i` is the elevation of point `i`.

### 3. Maximum Gradient over a Rolling Window

To avoid spurious spikes due to GPS noise in maximum gradient calculation, SegmentLab calculates the gradient over a rolling 10-point window (±5 points). This provides a more robust estimate of the actual maximum gradient. The gradient within this window is calculated as:

$$ \text{Max Gradient} = \max \left( \frac{\text{elev}_{i+5} - \text{elev}_{i-5}}{\text{dist}(P_{i-5}, P_{i+5})} \right) \times 100 \% $$

for each rolling window, where `dist(P_{i-5}, P_{i+5})` is the cumulative distance between point `P_{i-5}` and `P_{i+5}`.

### 4. Distance between GPS Points

The distance between two consecutive GPS points is calculated using the Haversine formula, which accounts for the Earth's curvature. While not explicitly shown in the provided code snippet, the `distanceBetween` function implements this calculation to ensure accuracy over longer distances. For short segments, it can be approximated with Euclidean distance on a plane, but for SegmentLab's robustness, a geodetic approach is preferred.

### 5. Average Speed

Average speed is calculated as the ratio of the total distance traveled to the time taken, converted to km/h:

$$ \text{Average Speed (km/h)} = \left( \frac{\text{Distance (m)}}{1000} \right) \div \left( \frac{\text{Duration (s)}}{3600} \right) $$

---

The differences compared to a simplified approach are significant:

*   **Gaussian Smoothing** — instead of taking two extreme points of the window, each point contributes with a weight proportional to $e^{-x^2/2\sigma^2}$. Central points weigh more, while distant points weigh almost nothing. Result: the gradient is much more stable even with noisy GPS data.
*   **Max Gradient on a 10-point Window** — instead of calculating it point-by-point (which gives absurd spikes due to GPS noise), it is calculated over a rolling window of ±5 points.
*   **Trapezoidal Elevation Gain** — sums only positive deltas point-by-point, more precise than the start/end difference which ignores undulations.
*   **Merge Gap** — two climbs separated by less than 150m of flat terrain are merged into one, covering the case of hairpins or traffic lights that `MAX_FLAT_METERS` might not capture (e.g., an intersection with 50m flat followed by another 50m flat).