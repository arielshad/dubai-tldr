import { useEffect, useMemo, useRef, useState } from "react";
import { allItems, feed } from "../data/feed";
import { CATEGORY_META } from "../data/categories";
import type { ReleaseItem } from "../data/schema";
import { track } from "../lib/analytics";

/** First batch rendered; grown by PAGE_SIZE as the sentinel scrolls
 *  into view. The newswire is a long flat stream so we keep the first
 *  paint cheap and stream the rest in. */
const INITIAL_COUNT = 40;
const PAGE_SIZE = 30;

const MONTHS = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];
const DOW = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

const importanceLabel: Record<ReleaseItem["importance"], string> = {
  rumor: "RUMOR",
  notable: "NOTABLE",
  major: "MAJOR",
  seismic: "SEISMIC",
};

/** Local-time parts for one item, all derived from the same Date so the
 *  day a row is grouped under always matches the time printed on it. */
function parts(iso: string): { dayKey: string; dayLabel: string; time: string } {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  const dayKey = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const dayLabel = `${DOW[d.getDay()]} ${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return { dayKey, dayLabel, time };
}

function NewsRow({
  item,
  time,
  onOpen,
}: {
  item: ReleaseItem;
  time: string;
  onOpen: (id: string) => void;
}) {
  const cat = item.categories[0];
  return (
    <article
      className={`news-item news-item-${item.importance}`}
      data-importance={item.importance}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(item.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(item.id);
        }
      }}
      aria-label={`${item.title} — ${item.org}`}
    >
      <span className="news-time">{time}</span>

      <div className="news-body">
        <div className="news-meta">
          {cat && (
            <span className="badge badge-cat news-cat">
              {CATEGORY_META[cat].label}
            </span>
          )}
          <span className={`badge badge-imp imp-${item.importance}`}>
            {importanceLabel[item.importance]}
          </span>
          <span className="news-org">{item.org}</span>
        </div>

        <h2 className="news-headline">{item.title}</h2>
        <p className="news-summary">{item.explainer?.tagline ?? item.summary}</p>
      </div>

      <a
        className="news-visit"
        href={item.url}
        target="_blank"
        rel="noreferrer noopener"
        onClick={(e) => {
          e.stopPropagation();
          track("opportunity:url-click", {
            id: item.id,
            category: cat,
            source: "news",
          });
        }}
        onKeyDown={(e) => e.stopPropagation()}
        aria-label={`Open ${item.title} source in new tab`}
        title="Open source ↗"
      >
        ↗
      </a>
    </article>
  );
}

export function NewsPage({
  onOpenOpportunity,
}: {
  onOpenOpportunity: (id: string) => void;
}) {
  // Whole self-updating feed, newest ingestion first — the same data the
  // DEALS grid renders, presented here as a reverse-chronological newswire.
  const items = useMemo(() => allItems(), []);
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const shown = items.slice(0, visibleCount);
  const hasMore = visibleCount < items.length;

  // Build the flat render list, inserting a day-divider whenever the
  // calendar day changes. The feed is sorted by publishDate DESC, so day
  // groups come out monotonic — no group is ever revisited.
  const rows = useMemo(() => {
    const out: (
      | { kind: "day"; key: string; label: string }
      | { kind: "item"; item: ReleaseItem; time: string }
    )[] = [];
    let lastDay = "";
    for (const item of shown) {
      const p = parts(item.publishDate);
      if (p.dayKey !== lastDay) {
        out.push({ kind: "day", key: p.dayKey, label: p.dayLabel });
        lastDay = p.dayKey;
      }
      out.push({ kind: "item", item, time: p.time });
    }
    return out;
  }, [shown]);

  // Infinite scroll — grow the slice when the sentinel nears the viewport.
  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((c) => Math.min(c + PAGE_SIZE, items.length));
        }
      },
      { rootMargin: "800px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, items.length]);

  const updated = useMemo(() => {
    if (!feed.generatedAt) return null;
    const p = parts(feed.generatedAt);
    return `${p.dayLabel} ${p.time}`;
  }, []);

  return (
    <>
      <div className="log-header">
        <h1 className="log-title">Dubai Property Newswire</h1>
        <span className="log-subtitle">
          {items.length} stories{updated ? ` · updated ${updated}` : ""}
        </span>
      </div>

      <div className="news-body-list">
        {items.length === 0 ? (
          <div className="log-empty">// no stories yet</div>
        ) : (
          <>
            {rows.map((row) =>
              row.kind === "day" ? (
                <div className="news-day" key={`day-${row.key}`}>
                  <span className="news-day-label">{row.label}</span>
                  <span className="news-day-rule" aria-hidden="true" />
                </div>
              ) : (
                <NewsRow
                  key={row.item.id}
                  item={row.item}
                  time={row.time}
                  onOpen={onOpenOpportunity}
                />
              ),
            )}
            {hasMore && (
              <div ref={sentinelRef} className="feed-sentinel" aria-hidden="true">
                <span className="feed-sentinel-dot" />
                <span className="feed-sentinel-dot" />
                <span className="feed-sentinel-dot" />
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
