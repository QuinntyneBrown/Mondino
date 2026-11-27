using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mondino.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSharesStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "SharesStatus",
                table: "Teammates",
                type: "boolean",
                nullable: false,
                // Every teammate shares their status until they turn it off (L2-015).
                defaultValue: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SharesStatus",
                table: "Teammates");
        }
    }
}
