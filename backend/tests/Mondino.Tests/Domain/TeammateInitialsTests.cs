// Traces to: L2-001
// Description: A teammate's initials are the first character of up to the first two words of the name

using Mondino.Domain.Teams;

namespace Mondino.Tests.Domain;

public sealed class TeammateInitialsTests
{
    [Theory]
    [InlineData("Mara Lindqvist", "ML")]
    [InlineData("Liam O’Connor", "LO")]
    [InlineData("Ahmed Al-Sayed", "AA")]
    [InlineData("Prince", "P")]
    [InlineData("  ana   maría  de la Cruz ", "AM")]
    [InlineData("Émile Zola", "ÉZ")]
    public void Initials_are_the_first_character_of_up_to_two_words(string name, string initials) =>
        Assert.Equal(initials, TeammateInitials.Of(name));
}
