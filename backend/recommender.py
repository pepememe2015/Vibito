from sqlalchemy.orm import Session

def get_recommendations(db: Session, user_id: int, top_n=5):
    try:
        # دریافت آهنگ‌هایی که کاربر لایک کرده
        query = """
            SELECT song_id FROM user_likes 
            WHERE user_id = :user_id
        """
        liked_songs = db.execute(query, {"user_id": user_id}).fetchall()
        liked_ids = [row[0] for row in liked_songs]
        
        # اگر کاربر چیزی لایک نکرده، آهنگ‌های محبوب را پیشنهاد بده
        if not liked_ids:
            popular_query = """
                SELECT song_id, COUNT(*) as cnt 
                FROM user_likes 
                GROUP BY song_id 
                ORDER BY cnt DESC 
                LIMIT :top
            """
            popular = db.execute(popular_query, {"top": top_n}).fetchall()
            return [row[0] for row in popular]
        
        # پیدا کردن کاربران مشابه (کسانی که آهنگ‌های مشابه لایک کرده‌اند)
        similar_users_query = """
            SELECT DISTINCT user_id 
            FROM user_likes 
            WHERE song_id IN ({})
            AND user_id != :user_id
            LIMIT 10
        """.format(','.join(['?'] * len(liked_ids)))
        
        params = liked_ids + [user_id]
        similar_users = db.execute(similar_users_query, params).fetchall()
        similar_ids = [row[0] for row in similar_users]
        
        # اگر کاربر مشابهی وجود نداشت
        if not similar_ids:
            return []
        
        # آهنگ‌هایی که کاربران مشابه لایک کرده‌اند ولی کاربر فعلی لایک نکرده
        recommendations_query = """
            SELECT DISTINCT song_id 
            FROM user_likes 
            WHERE user_id IN ({})
            AND song_id NOT IN ({})
            LIMIT :top
        """.format(
            ','.join(['?'] * len(similar_ids)),
            ','.join(['?'] * len(liked_ids)) if liked_ids else '0'
        )
        
        rec_params = similar_ids + (liked_ids if liked_ids else []) + [top_n]
        recommendations = db.execute(recommendations_query, rec_params).fetchall()
        
        return [row[0] for row in recommendations]
        
    except Exception as e:
        print(f"Error in recommender: {e}")
        return []