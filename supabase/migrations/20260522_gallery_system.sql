-- =============================================================================
-- Gallery System Migration: Be Booking
-- Tables for haircut gallery with likes and ranking
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. GALLERY_ITEMS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS gallery_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Image storage
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    
    -- Attribution
    stylist_id UUID REFERENCES stylists(id) ON DELETE SET NULL,
    
    -- Content
    title TEXT,
    description TEXT,
    
    -- Weekly organization
    week_number INT NOT NULL CHECK (week_number >= 1 AND week_number <= 53),
    year INT NOT NULL CHECK (year >= 2024),
    
    -- Engagement
    like_count INT DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_gallery_stylist ON gallery_items(stylist_id);
CREATE INDEX IF NOT EXISTS idx_gallery_week ON gallery_items(year, week_number);
CREATE INDEX IF NOT EXISTS idx_gallery_featured ON gallery_items(is_featured);
CREATE INDEX IF NOT EXISTS idx_gallery_active ON gallery_items(is_active);
CREATE INDEX IF NOT EXISTS idx_gallery_likes ON gallery_items(like_count DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_gallery_items_updated_at
    BEFORE UPDATE ON gallery_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE gallery_items IS 'Haircut gallery images with likes and weekly organization';

-- =============================================================================
-- 2. GALLERY_LIKES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS gallery_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gallery_item_id UUID NOT NULL REFERENCES gallery_items(id) ON DELETE CASCADE,
    visitor_id TEXT NOT NULL,  -- Cookie-based ID, no login required
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent duplicate likes from same visitor
    UNIQUE(gallery_item_id, visitor_id)
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_gallery_likes_item ON gallery_likes(gallery_item_id);
CREATE INDEX IF NOT EXISTS idx_gallery_likes_visitor ON gallery_likes(visitor_id);

COMMENT ON TABLE gallery_likes IS 'Likes for gallery items (cookie-based, no auth required)';

-- =============================================================================
-- 3. AUTO-INCREMENT LIKE_COUNT TRIGGER
-- =============================================================================

-- Function to increment like_count
CREATE OR REPLACE FUNCTION increment_gallery_like_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE gallery_items 
    SET like_count = like_count + 1 
    WHERE id = NEW.gallery_item_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to decrement like_count
CREATE OR REPLACE FUNCTION decrement_gallery_like_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE gallery_items 
    SET like_count = GREATEST(0, like_count - 1) 
    WHERE id = OLD.gallery_item_id;
    RETURN OLD;
END;
$$ language 'plpgsql';

-- Trigger for new likes
DROP TRIGGER IF EXISTS gallery_like_added ON gallery_likes;
CREATE TRIGGER gallery_like_added
    AFTER INSERT ON gallery_likes
    FOR EACH ROW
    EXECUTE FUNCTION increment_gallery_like_count();

-- Trigger for removed likes
DROP TRIGGER IF EXISTS gallery_like_removed ON gallery_likes;
CREATE TRIGGER gallery_like_removed
    AFTER DELETE ON gallery_likes
    FOR EACH ROW
    EXECUTE FUNCTION decrement_gallery_like_count();

-- =============================================================================
-- 4. ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE gallery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_likes ENABLE ROW LEVEL SECURITY;

-- Gallery Items: Public can read active items
CREATE POLICY "Public can read active gallery items"
ON gallery_items
FOR SELECT
USING (is_active = true);

-- Gallery Items: Admin can do everything
CREATE POLICY "Admin can manage gallery items"
ON gallery_items
FOR ALL
USING (auth.role() = 'authenticated');

-- Gallery Likes: Public can read
CREATE POLICY "Public can read likes"
ON gallery_likes
FOR SELECT
USING (true);

-- Gallery Likes: Public can insert (no auth needed for likes)
CREATE POLICY "Public can like"
ON gallery_likes
FOR INSERT
WITH CHECK (true);

-- Gallery Likes: Public can delete (to unlike)
CREATE POLICY "Public can unlike"
ON gallery_likes
FOR DELETE
USING (true);

-- =============================================================================
-- 5. HELPER FUNCTIONS
-- =============================================================================

-- Get gallery items with ranking (for frontend)
CREATE OR REPLACE FUNCTION get_gallery_items(
    p_limit INT DEFAULT 50,
    p_offset INT DEFAULT 0,
    p_stylist_id UUID DEFAULT NULL,
    p_year INT DEFAULT NULL,
    p_week INT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    image_url TEXT,
    thumbnail_url TEXT,
    stylist_id UUID,
    stylist_name TEXT,
    title TEXT,
    description TEXT,
    week_number INT,
    year INT,
    like_count INT,
    is_featured BOOLEAN,
    created_at TIMESTAMPTZ,
    user_has_liked BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gi.id,
        gi.image_url,
        gi.thumbnail_url,
        gi.stylist_id,
        COALESCE(s.name, 'Unknown'::TEXT) as stylist_name,
        gi.title,
        gi.description,
        gi.week_number,
        gi.year,
        gi.like_count,
        gi.is_featured,
        gi.created_at,
        FALSE as user_has_liked
    FROM gallery_items gi
    LEFT JOIN stylists s ON gi.stylist_id = s.id
    WHERE gi.is_active = true
      AND (p_stylist_id IS NULL OR gi.stylist_id = p_stylist_id)
      AND (p_year IS NULL OR gi.year = p_year)
      AND (p_week IS NULL OR gi.week_number = p_week)
    ORDER BY 
        gi.is_featured DESC,
        gi.like_count DESC,
        gi.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Get current week number
CREATE OR REPLACE FUNCTION get_current_week() 
RETURNS INT AS $$
BEGIN
    RETURN EXTRACT(WEEK FROM CURRENT_DATE)::INT;
END;
$$ LANGUAGE plpgsql;

-- Get current year
CREATE OR REPLACE FUNCTION get_current_year() 
RETURNS INT AS $$
BEGIN
    RETURN EXTRACT(YEAR FROM CURRENT_DATE)::INT;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- =============================================================================
-- VERIFICATION: Run these to test
-- =============================================================================

-- SELECT * FROM get_gallery_items(10, 0, NULL, NULL, NULL);
-- SELECT get_current_week();
-- SELECT get_current_year();
