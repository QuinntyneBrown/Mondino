using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mondino.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddJoining : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "JoinRequestId",
                table: "Teammates",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PostalCode",
                table: "Teammates",
                type: "character varying(12)",
                maxLength: 12,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DirectoryId",
                table: "Cities",
                type: "character varying(16)",
                maxLength: 16,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Teammates_TeamId_JoinRequestId",
                table: "Teammates",
                columns: new[] { "TeamId", "JoinRequestId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Cities_DirectoryId",
                table: "Cities",
                column: "DirectoryId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Teammates_TeamId_JoinRequestId",
                table: "Teammates");

            migrationBuilder.DropIndex(
                name: "IX_Cities_DirectoryId",
                table: "Cities");

            migrationBuilder.DropColumn(
                name: "JoinRequestId",
                table: "Teammates");

            migrationBuilder.DropColumn(
                name: "PostalCode",
                table: "Teammates");

            migrationBuilder.DropColumn(
                name: "DirectoryId",
                table: "Cities");
        }
    }
}
