using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mondino.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddTeammateSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ClockFormat",
                table: "Teammates",
                type: "character varying(16)",
                maxLength: 16,
                nullable: false,
                defaultValue: "TwentyFourHour");

            migrationBuilder.AddColumn<string>(
                name: "MomentKinds",
                table: "Teammates",
                type: "character varying(64)",
                maxLength: 64,
                nullable: false,
                // Every kind is on until a teammate turns one off (L2-022).
                defaultValue: "Holiday,Formula1,LocalEvent,Sport");

            migrationBuilder.AddColumn<string>(
                name: "TemperatureUnit",
                table: "Teammates",
                type: "character varying(16)",
                maxLength: 16,
                nullable: false,
                defaultValue: "Celsius");

            // Each teammate already in a team takes the defaults of their city's country, as a new
            // teammate does (docs/adr/0023): °F in the United States, the 12-hour clock in the United
            // States and Canada.
            migrationBuilder.Sql(
                """
                UPDATE "Teammates" AS t
                SET "TemperatureUnit" = CASE WHEN c."CountryCode" = 'US' THEN 'Fahrenheit' ELSE 'Celsius' END,
                    "ClockFormat" = CASE WHEN c."CountryCode" IN ('US', 'CA') THEN 'TwelveHour' ELSE 'TwentyFourHour' END
                FROM "Cities" AS c
                WHERE c."Id" = t."CityId";
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ClockFormat",
                table: "Teammates");

            migrationBuilder.DropColumn(
                name: "MomentKinds",
                table: "Teammates");

            migrationBuilder.DropColumn(
                name: "TemperatureUnit",
                table: "Teammates");
        }
    }
}
