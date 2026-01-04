-- ========================================
-- RAG System Analytics Queries
-- Dùng để lấy thông tin thống kê cho báo cáo
-- ========================================
-- 1. PHÂN PHỐI LOẠI QUAN HỆ (Relationship Type Distribution)
-- Biểu đồ 1: Phân phối loại quan hệ trong hệ thống
SELECT "relationType",
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM "GraphRelation"
GROUP BY "relationType"
ORDER BY count DESC;
-- Output mẫu:
-- relationType    | count | percentage
-- ----------------|-------|------------
-- relates_to      | 450   | 45.00
-- uses            | 380   | 38.00
-- co_occurs       | 220   | 22.00
-- built_on        | 150   | 15.00
-- ========================================
-- 2. WEIGHT ACCUMULATION QUA NHIỀU NGUỒN (Cross-Source Weight)
-- Bảng 3: Weight Accumulation qua nhiều nguồn
SELECT e1.label AS from_entity,
    gr."relationType",
    e2.label AS to_entity,
    gr.weight AS accumulated_weight,
    LN(1 + gr.weight) AS graph_score,
    COUNT(DISTINCT gr."sourceId") AS source_count
FROM "GraphRelation" gr
    JOIN "GraphEntity" e1 ON gr."fromEntityId" = e1.id
    JOIN "GraphEntity" e2 ON gr."toEntityId" = e2.id
WHERE gr.weight > 1.5 -- Chỉ lấy những quan hệ có weight tích lũy
GROUP BY gr.id,
    e1.label,
    gr."relationType",
    e2.label,
    gr.weight
ORDER BY gr.weight DESC
LIMIT 20;
-- Output mẫu:
-- from_entity | relationType | to_entity   | accumulated_weight | graph_score | source_count
-- ------------|--------------|-------------|--------------------|-------------|-------------
-- React       | uses         | JavaScript  | 2.38               | 1.22        | 3
-- Next.js     | built_on     | React       | 1.67               | 0.98        | 2
-- Python      | uses         | Django      | 0.78               | 0.58        | 1
-- ========================================
-- 3. TOP ENTITIES BY CONNECTIVITY (Entities có nhiều quan hệ nhất)
-- Hữu ích để biết thực thể nào "trung tâm" trong knowledge graph
SELECT e.label,
    e.type,
    COUNT(DISTINCT gr.id) as total_connections,
    COUNT(
        DISTINCT CASE
            WHEN gr."fromEntityId" = e.id THEN gr.id
        END
    ) as outgoing,
    COUNT(
        DISTINCT CASE
            WHEN gr."toEntityId" = e.id THEN gr.id
        END
    ) as incoming,
    COUNT(DISTINCT gr."sourceId") as appears_in_sources
FROM "GraphEntity" e
    LEFT JOIN "GraphRelation" gr ON e.id = gr."fromEntityId"
    OR e.id = gr."toEntityId"
GROUP BY e.id,
    e.label,
    e.type
HAVING COUNT(DISTINCT gr.id) > 0
ORDER BY total_connections DESC
LIMIT 15;
-- Output mẫu:
-- label      | type       | total_connections | outgoing | incoming | appears_in_sources
-- -----------|------------|-------------------|----------|----------|--------------------
-- React      | TECHNOLOGY | 45                | 28       | 17       | 8
-- JavaScript | LANGUAGE   | 38                | 15       | 23       | 10
-- Next.js    | FRAMEWORK  | 32                | 20       | 12       | 5
-- ========================================
-- 4. WEIGHT DISTRIBUTION (Phân phối trọng số)
-- Bảng để phân tích xem có weight bị inflate không
SELECT CASE
        WHEN weight < 1 THEN '< 1.0'
        WHEN weight >= 1
        AND weight < 2 THEN '1.0 - 2.0'
        WHEN weight >= 2
        AND weight < 3 THEN '2.0 - 3.0'
        WHEN weight >= 3
        AND weight < 5 THEN '3.0 - 5.0'
        ELSE '>= 5.0'
    END AS weight_range,
    COUNT(*) as count,
    ROUND(AVG(weight), 3) as avg_weight,
    ROUND(MIN(weight), 3) as min_weight,
    ROUND(MAX(weight), 3) as max_weight
FROM "GraphRelation"
GROUP BY weight_range
ORDER BY min_weight;
-- Output mẫu:
-- weight_range | count | avg_weight | min_weight | max_weight
-- -------------|-------|------------|------------|------------
-- < 1.0        | 380   | 0.685      | 0.200      | 0.990
-- 1.0 - 2.0    | 145   | 1.420      | 1.010      | 1.980
-- 2.0 - 3.0    | 38    | 2.350      | 2.050      | 2.950
-- 3.0 - 5.0    | 12    | 3.780      | 3.100      | 4.850
-- ========================================
-- 5. ENTITY EXTRACTION SUCCESS RATE (Tỷ lệ thành công trích xuất thực thể)
-- Số lượng entities mỗi source, để đánh giá extraction quality
SELECT s.id AS source_id,
    s.name AS source_name,
    COUNT(DISTINCT ge.id) AS entity_count,
    COUNT(
        DISTINCT CASE
            WHEN ge.type = 'TECHNOLOGY' THEN ge.id
        END
    ) AS tech_count,
    COUNT(
        DISTINCT CASE
            WHEN ge.type = 'FRAMEWORK' THEN ge.id
        END
    ) AS framework_count,
    COUNT(
        DISTINCT CASE
            WHEN ge.type = 'LIBRARY' THEN ge.id
        END
    ) AS library_count
FROM "Source" s
    LEFT JOIN "GraphEntity" ge ON s.id = ge."sourceId"
WHERE s."userId" IS NOT NULL -- Chỉ user sources
GROUP BY s.id,
    s.name
ORDER BY entity_count DESC
LIMIT 20;
-- Output mẫu:
-- source_id | source_name            | entity_count | tech_count | framework_count | library_count
-- ----------|------------------------|--------------|------------|-----------------|---------------
-- abc-123   | react_nextjs.txt       | 42           | 15         | 8               | 12
-- def-456   | python_basics.txt      | 38           | 10         | 5               | 18
-- ghi-789   | databases_sql.txt      | 25           | 8          | 3               | 7
-- ========================================
-- 6. GRAPH SCORE SIMULATION (Mô phỏng graph score cho comparison)
-- Tính toán graph score từ weight để so sánh với vector score
WITH chunk_graph_scores AS (
    SELECT dc.id AS chunk_id,
        dc."sourceId",
        dc.content,
        COUNT(DISTINCT gr.id) AS relation_count,
        AVG(gr.weight) AS avg_weight,
        MAX(gr.weight) AS max_weight,
        LN(1 + COALESCE(MAX(gr.weight), 0)) AS max_graph_score
    FROM "DocumentChunk" dc
        LEFT JOIN "GraphEntity" ge ON dc.id = ge."chunkId"
        LEFT JOIN "GraphRelation" gr ON ge.id = gr."fromEntityId"
        OR ge.id = gr."toEntityId"
    GROUP BY dc.id,
        dc."sourceId",
        dc.content
)
SELECT "sourceId",
    ROUND(AVG(max_graph_score), 3) AS avg_graph_score,
    ROUND(MAX(max_graph_score), 3) AS max_graph_score,
    ROUND(AVG(relation_count), 1) AS avg_relations_per_chunk,
    COUNT(*) AS chunk_count
FROM chunk_graph_scores
WHERE relation_count > 0
GROUP BY "sourceId"
ORDER BY avg_graph_score DESC
LIMIT 10;
-- Output mẫu:
-- sourceId  | avg_graph_score | max_graph_score | avg_relations_per_chunk | chunk_count
-- ----------|-----------------|-----------------|-------------------------|-------------
-- abc-123   | 1.150           | 1.790           | 8.5                     | 12
-- def-456   | 0.980           | 1.560           | 6.2                     | 15
-- ghi-789   | 0.750           | 1.220           | 4.8                     | 10
-- ========================================
-- 7. TEMPORAL ANALYSIS (Phân tích theo thời gian - nếu cần)
-- Xem quan hệ được tạo khi nào, có bị cũ không
SELECT DATE_TRUNC('day', gr."createdAt") AS date,
    COUNT(*) AS relations_created,
    ROUND(AVG(gr.weight), 3) AS avg_weight,
    COUNT(DISTINCT gr."sourceId") AS sources_affected
FROM "GraphRelation" gr
WHERE gr."createdAt" >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', gr."createdAt")
ORDER BY date DESC;
-- Output mẫu:
-- date       | relations_created | avg_weight | sources_affected
-- -----------|-------------------|------------|------------------
-- 2026-01-04 | 125               | 0.820      | 5
-- 2026-01-03 | 89                | 0.750      | 3
-- 2026-01-02 | 156               | 0.880      | 8
-- ========================================
-- 8. CO-OCCURRENCE ANALYSIS (Phân tích đồng xuất hiện)
-- Xem các thực thể nào hay xuất hiện cùng nhau
SELECT e1.label AS entity_1,
    e2.label AS entity_2,
    COUNT(DISTINCT gr."evidenceChunkId") AS co_occurrence_count,
    AVG(gr.weight) AS avg_weight,
    COUNT(DISTINCT gr."sourceId") AS in_sources
FROM "GraphRelation" gr
    JOIN "GraphEntity" e1 ON gr."fromEntityId" = e1.id
    JOIN "GraphEntity" e2 ON gr."toEntityId" = e2.id
WHERE gr."relationType" = 'co_occurs'
GROUP BY e1.label,
    e2.label
HAVING COUNT(DISTINCT gr."evidenceChunkId") > 1
ORDER BY co_occurrence_count DESC
LIMIT 20;
-- Output mẫu:
-- entity_1   | entity_2   | co_occurrence_count | avg_weight | in_sources
-- -----------|------------|---------------------|------------|------------
-- React      | Next.js    | 15                  | 0.200      | 5
-- JavaScript | TypeScript | 12                  | 0.200      | 6
-- Python     | Django     | 8                   | 0.200      | 3
-- ========================================
-- 9. CHUNKS WITHOUT GRAPH COVERAGE (Chunks không có graph entities)
-- Giúp tìm ra chunks cần bổ sung entity extraction
SELECT dc."sourceId",
    COUNT(*) AS chunks_without_entities,
    ROUND(
        COUNT(*) * 100.0 / (
            SELECT COUNT(*)
            FROM "DocumentChunk"
            WHERE "sourceId" = dc."sourceId"
        ),
        2
    ) AS percentage
FROM "DocumentChunk" dc
    LEFT JOIN "GraphEntity" ge ON dc.id = ge."chunkId"
WHERE ge.id IS NULL
GROUP BY dc."sourceId"
ORDER BY chunks_without_entities DESC;
-- Output mẫu:
-- sourceId  | chunks_without_entities | percentage
-- ----------|-------------------------|------------
-- abc-123   | 8                       | 25.00
-- def-456   | 3                       | 12.50
-- ghi-789   | 0                       | 0.00
-- ========================================
-- 10. STRONGEST RELATIONSHIPS (Quan hệ mạnh nhất - top weight)
-- Để hiểu được knowledge graph chính xác
SELECT e1.label AS from_entity,
    gr."relationType",
    e2.label AS to_entity,
    ROUND(gr.weight, 3) AS weight,
    ROUND(LN(1 + gr.weight), 3) AS graph_score,
    COUNT(DISTINCT gr."sourceId") AS source_count,
    ARRAY_AGG(
        DISTINCT s.name
        ORDER BY s.name
    ) AS source_names
FROM "GraphRelation" gr
    JOIN "GraphEntity" e1 ON gr."fromEntityId" = e1.id
    JOIN "GraphEntity" e2 ON gr."toEntityId" = e2.id
    JOIN "Source" s ON gr."sourceId" = s.id
GROUP BY gr.id,
    e1.label,
    gr."relationType",
    e2.label,
    gr.weight
ORDER BY gr.weight DESC
LIMIT 30;
-- Output mẫu:
-- from_entity | relationType | to_entity   | weight | graph_score | source_count | source_names
-- ------------|--------------|-------------|--------|-------------|--------------|----------------------------------
-- React       | uses         | JavaScript  | 2.380  | 1.220       | 3            | {react_nextjs.txt, web_dev.txt}
-- Next.js     | built_on     | React       | 1.670  | 0.980       | 2            | {react_nextjs.txt, fullstack.txt}
-- ========================================
-- CÁCH DÙNG:
-- 1. Copy query cần thiết
-- 2. Chạy trong PostgreSQL client hoặc Drizzle Studio
-- 3. Export kết quả sang CSV/JSON để vẽ biểu đồ trong Excel/Python
--
-- Hoặc tạo API endpoint riêng để fetch analytics:
-- GET /api/rag/analytics?type=relation-distribution
-- GET /api/rag/analytics?type=weight-accumulation
-- etc.