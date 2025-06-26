"""create portfolio tables

Revision ID: 024
Revises: 023
Create Date: 2025-01-08 15:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '024'
down_revision = '023'
branch_labels = None
depends_on = None

def upgrade():
    # Создаем enum для категорий достижений
    achievement_category_enum = postgresql.ENUM(
        'academic', 'sports', 'creative', 'volunteer', 'professional', 
        name='achievementcategory'
    )
    achievement_category_enum.create(op.get_bind())

    # Создаем таблицу достижений портфолио
    op.create_table('portfolio_achievements',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('category', achievement_category_enum, nullable=False),
        sa.Column('achievement_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('organization', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_portfolio_achievements_id'), 'portfolio_achievements', ['id'], unique=False)
    op.create_index(op.f('ix_portfolio_achievements_user_id'), 'portfolio_achievements', ['user_id'], unique=False)

    # Создаем таблицу файлов портфолио
    op.create_table('portfolio_files',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('achievement_id', sa.Integer(), nullable=False),
        sa.Column('filename', sa.String(), nullable=False),
        sa.Column('original_filename', sa.String(), nullable=False),
        sa.Column('file_path', sa.String(), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.Column('content_type', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['achievement_id'], ['portfolio_achievements.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_portfolio_files_id'), 'portfolio_files', ['id'], unique=False)
    op.create_index(op.f('ix_portfolio_files_achievement_id'), 'portfolio_files', ['achievement_id'], unique=False)

def downgrade():
    # Удаляем таблицы
    op.drop_index(op.f('ix_portfolio_files_achievement_id'), table_name='portfolio_files')
    op.drop_index(op.f('ix_portfolio_files_id'), table_name='portfolio_files')
    op.drop_table('portfolio_files')
    
    op.drop_index(op.f('ix_portfolio_achievements_user_id'), table_name='portfolio_achievements')
    op.drop_index(op.f('ix_portfolio_achievements_id'), table_name='portfolio_achievements')
    op.drop_table('portfolio_achievements')
    
    # Удаляем enum
    sa.Enum(name='achievementcategory').drop(op.get_bind()) 