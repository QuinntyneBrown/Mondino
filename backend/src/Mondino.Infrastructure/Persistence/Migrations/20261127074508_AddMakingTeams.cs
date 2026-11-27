using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mondino.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddMakingTeams : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CreateRequestId",
                table: "Teams",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EmailFingerprint",
                table: "Teammates",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Teams_CreateRequestId",
                table: "Teams",
                column: "CreateRequestId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Teammates_EmailFingerprint",
                table: "Teammates",
                column: "EmailFingerprint");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Teams_CreateRequestId",
                table: "Teams");

            migrationBuilder.DropIndex(
                name: "IX_Teammates_EmailFingerprint",
                table: "Teammates");

            migrationBuilder.DropColumn(
                name: "CreateRequestId",
                table: "Teams");

            migrationBuilder.DropColumn(
                name: "EmailFingerprint",
                table: "Teammates");
        }
    }
}
