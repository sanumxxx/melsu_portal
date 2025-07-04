"""Add OAuth fields to user profile

Revision ID: 59acfe778956
Revises: a7843b1b03ca
Create Date: 2025-07-03 20:02:54.753146

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '59acfe778956'
down_revision: Union[str, None] = 'a7843b1b03ca'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('user_profiles', sa.Column('vk_oauth_token', sa.String(length=500), nullable=True))
    op.add_column('user_profiles', sa.Column('vk_oauth_refresh_token', sa.String(length=500), nullable=True))
    op.add_column('user_profiles', sa.Column('vk_oauth_expires_at', sa.DateTime(), nullable=True))
    op.add_column('user_profiles', sa.Column('vk_user_info', sa.JSON(), nullable=True))
    op.add_column('user_profiles', sa.Column('telegram_username', sa.String(length=100), nullable=True))
    op.add_column('user_profiles', sa.Column('telegram_user_info', sa.JSON(), nullable=True))
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('user_profiles', 'telegram_user_info')
    op.drop_column('user_profiles', 'telegram_username')
    op.drop_column('user_profiles', 'vk_user_info')
    op.drop_column('user_profiles', 'vk_oauth_expires_at')
    op.drop_column('user_profiles', 'vk_oauth_refresh_token')
    op.drop_column('user_profiles', 'vk_oauth_token')
    # ### end Alembic commands ###
