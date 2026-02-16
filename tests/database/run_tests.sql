-- =============================================================================
-- Neck Diagrams - Database Test Suite
-- =============================================================================
-- Run with: psql -d neck_diagrams -f run_tests.sql
-- Or: docker exec -i postgres psql -U postgres -d neck_diagrams < run_tests.sql
-- =============================================================================

\echo '============================================='
\echo 'Neck Diagrams Database Test Suite'
\echo '============================================='
\echo ''

-- Track test results
CREATE TEMP TABLE test_results (
    test_name TEXT,
    passed BOOLEAN,
    details TEXT
);

-- =============================================================================
-- TEST 1: Scale Intervals Start With Root (0)
-- =============================================================================
\echo 'TEST 1: Scale intervals start with root (0)'

DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO invalid_count
    FROM scales
    WHERE intervals[1] != 0;
    
    IF invalid_count = 0 THEN
        INSERT INTO test_results VALUES ('Scale intervals start with root', TRUE, 'All scales start with 0');
        RAISE NOTICE 'PASS: All scales start with root (0)';
    ELSE
        INSERT INTO test_results VALUES ('Scale intervals start with root', FALSE, 
            invalid_count || ' scales do not start with 0');
        RAISE NOTICE 'FAIL: % scales do not start with root (0)', invalid_count;
    END IF;
END $$;

-- =============================================================================
-- TEST 2: Scale Intervals Within Valid Range (0-11)
-- =============================================================================
\echo 'TEST 2: Scale intervals within valid range (0-11)'

DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO invalid_count
    FROM scales
    WHERE EXISTS (
        SELECT 1 FROM unnest(intervals) AS i 
        WHERE i < 0 OR i > 11
    );
    
    IF invalid_count = 0 THEN
        INSERT INTO test_results VALUES ('Scale intervals valid range', TRUE, 'All intervals are 0-11');
        RAISE NOTICE 'PASS: All intervals are within 0-11';
    ELSE
        INSERT INTO test_results VALUES ('Scale intervals valid range', FALSE, 
            invalid_count || ' scales have invalid intervals');
        RAISE NOTICE 'FAIL: % scales have intervals outside 0-11', invalid_count;
    END IF;
END $$;

-- =============================================================================
-- TEST 3: Scale Intervals Are Sorted Ascending
-- =============================================================================
\echo 'TEST 3: Scale intervals are sorted ascending'

DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO invalid_count
    FROM scales s
    WHERE intervals != (
        SELECT ARRAY(SELECT unnest(s.intervals) ORDER BY 1)
    );
    
    IF invalid_count = 0 THEN
        INSERT INTO test_results VALUES ('Scale intervals sorted', TRUE, 'All intervals are sorted');
        RAISE NOTICE 'PASS: All scale intervals are sorted ascending';
    ELSE
        INSERT INTO test_results VALUES ('Scale intervals sorted', FALSE, 
            invalid_count || ' scales have unsorted intervals');
        RAISE NOTICE 'FAIL: % scales have unsorted intervals', invalid_count;
    END IF;
END $$;

-- =============================================================================
-- TEST 4: Tuning String Count Matches Notes Array Length
-- =============================================================================
\echo 'TEST 4: Tuning string count matches notes array length'

DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO invalid_count
    FROM tunings
    WHERE strings != array_length(notes, 1);
    
    IF invalid_count = 0 THEN
        INSERT INTO test_results VALUES ('Tuning strings match notes', TRUE, 'All tunings match');
        RAISE NOTICE 'PASS: All tuning string counts match notes array length';
    ELSE
        INSERT INTO test_results VALUES ('Tuning strings match notes', FALSE, 
            invalid_count || ' tunings have mismatched counts');
        RAISE NOTICE 'FAIL: % tunings have mismatched string counts', invalid_count;
    END IF;
END $$;

-- =============================================================================
-- TEST 5: Tuning Notes Are Valid Chromatic Notes
-- =============================================================================
\echo 'TEST 5: Tuning notes are valid chromatic notes'

DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO invalid_count
    FROM tunings
    WHERE EXISTS (
        SELECT 1 FROM unnest(notes) AS n
        WHERE n NOT IN ('C','C#','Db','D','D#','Eb','E','F','F#','Gb','G','G#','Ab','A','A#','Bb','B')
    );
    
    IF invalid_count = 0 THEN
        INSERT INTO test_results VALUES ('Tuning notes valid', TRUE, 'All notes are valid');
        RAISE NOTICE 'PASS: All tuning notes are valid chromatic notes';
    ELSE
        INSERT INTO test_results VALUES ('Tuning notes valid', FALSE, 
            invalid_count || ' tunings have invalid notes');
        RAISE NOTICE 'FAIL: % tunings have invalid note names', invalid_count;
    END IF;
END $$;

-- =============================================================================
-- TEST 6: Mode Numbers Are Valid (1-7) For Modal Categories
-- =============================================================================
\echo 'TEST 6: Mode numbers valid for modal categories'

DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO invalid_count
    FROM scales
    WHERE category IN ('major', 'harmonic', 'melodic')
      AND (mode_number IS NULL OR mode_number < 1 OR mode_number > 7);
    
    IF invalid_count = 0 THEN
        INSERT INTO test_results VALUES ('Mode numbers valid', TRUE, 'All mode numbers are 1-7');
        RAISE NOTICE 'PASS: All mode numbers are valid (1-7)';
    ELSE
        INSERT INTO test_results VALUES ('Mode numbers valid', FALSE, 
            invalid_count || ' scales have invalid mode numbers');
        RAISE NOTICE 'FAIL: % scales have invalid mode numbers', invalid_count;
    END IF;
END $$;

-- =============================================================================
-- TEST 7: Parent Scale Relationships Are Set For Modes 2-7
-- =============================================================================
\echo 'TEST 7: Parent scale relationships set for modes 2-7'

DO $$
DECLARE
    missing_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO missing_count
    FROM scales
    WHERE category IN ('major', 'harmonic', 'melodic')
      AND mode_number > 1
      AND parent_scale_id IS NULL;
    
    IF missing_count = 0 THEN
        INSERT INTO test_results VALUES ('Parent scale relationships', TRUE, 'All modes have parents');
        RAISE NOTICE 'PASS: All modes 2-7 have parent_scale_id set';
    ELSE
        INSERT INTO test_results VALUES ('Parent scale relationships', FALSE, 
            missing_count || ' modes missing parent_scale_id');
        RAISE NOTICE 'FAIL: % modes are missing parent_scale_id', missing_count;
    END IF;
END $$;

-- =============================================================================
-- TEST 8: Scale Categories Are Valid
-- =============================================================================
\echo 'TEST 8: Scale categories are valid'

DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO invalid_count
    FROM scales
    WHERE category NOT IN ('major', 'harmonic', 'melodic', 'pentatonic', 'blues', 'symmetric', 'exotic');
    
    IF invalid_count = 0 THEN
        INSERT INTO test_results VALUES ('Scale categories valid', TRUE, 'All categories are valid');
        RAISE NOTICE 'PASS: All scale categories are valid';
    ELSE
        INSERT INTO test_results VALUES ('Scale categories valid', FALSE, 
            invalid_count || ' scales have invalid categories');
        RAISE NOTICE 'FAIL: % scales have invalid categories', invalid_count;
    END IF;
END $$;

-- =============================================================================
-- TEST 9: Tuning Categories Are Valid
-- =============================================================================
\echo 'TEST 9: Tuning categories are valid'

DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO invalid_count
    FROM tunings
    WHERE category NOT IN ('standard', 'drop', 'open', 'bass', 'extended', 'alternate');
    
    IF invalid_count = 0 THEN
        INSERT INTO test_results VALUES ('Tuning categories valid', TRUE, 'All categories are valid');
        RAISE NOTICE 'PASS: All tuning categories are valid';
    ELSE
        INSERT INTO test_results VALUES ('Tuning categories valid', FALSE, 
            invalid_count || ' tunings have invalid categories');
        RAISE NOTICE 'FAIL: % tunings have invalid categories', invalid_count;
    END IF;
END $$;

-- =============================================================================
-- TEST 10: No Duplicate Scale Names Within Category
-- =============================================================================
\echo 'TEST 10: No duplicate scale names within category'

DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT name, category, root_note, COUNT(*)
        FROM scales
        GROUP BY name, category, root_note
        HAVING COUNT(*) > 1
    ) duplicates;
    
    IF duplicate_count = 0 THEN
        INSERT INTO test_results VALUES ('No duplicate scales', TRUE, 'No duplicates found');
        RAISE NOTICE 'PASS: No duplicate scale names within category';
    ELSE
        INSERT INTO test_results VALUES ('No duplicate scales', FALSE, 
            duplicate_count || ' duplicate scale groups found');
        RAISE NOTICE 'FAIL: % duplicate scale name groups found', duplicate_count;
    END IF;
END $$;

-- =============================================================================
-- TEST SUMMARY
-- =============================================================================
\echo ''
\echo '============================================='
\echo 'TEST SUMMARY'
\echo '============================================='

SELECT 
    CASE WHEN passed THEN 'PASS' ELSE 'FAIL' END AS status,
    test_name,
    details
FROM test_results
ORDER BY passed DESC, test_name;

\echo ''

SELECT 
    COUNT(*) FILTER (WHERE passed) AS passed,
    COUNT(*) FILTER (WHERE NOT passed) AS failed,
    COUNT(*) AS total,
    ROUND(100.0 * COUNT(*) FILTER (WHERE passed) / COUNT(*), 1) AS pass_rate
FROM test_results;

-- Cleanup
DROP TABLE test_results;

\echo ''
\echo 'Test suite complete.'
