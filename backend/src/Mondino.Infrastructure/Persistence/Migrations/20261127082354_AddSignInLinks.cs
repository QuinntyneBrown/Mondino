using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mondino.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSignInLinks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SignInLinks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TokenHash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    EmailFingerprint = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    SealedEmail = table.Column<byte[]>(type: "bytea", maxLength: 512, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ExpiresAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UsedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SignInLinks", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SignInLinks_EmailFingerprint",
                table: "SignInLinks",
                column: "EmailFingerprint");

            migrationBuilder.CreateIndex(
                name: "IX_SignInLinks_TokenHash",
                table: "SignInLinks",
                column: "TokenHash",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SignInLinks");
        }
    }
}
